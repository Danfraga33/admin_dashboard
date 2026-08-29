-- Memories: personal photo/video vault. Tags only, no albums.
-- Files live in the private `memories` storage bucket at {user_id}/{memory_id}.{ext};
-- this table is the index over them.

create table memories (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  storage_path     text not null unique,
  kind             text not null check (kind in ('image', 'video')),
  mime_type        text not null,
  size_bytes       bigint,
  width            int,
  height           int,
  duration_seconds numeric,
  caption          text,
  taken_at         timestamptz not null default now(),
  tags             text[] not null default '{}',
  favorite         boolean not null default false,
  created_at       timestamptz not null default now()
);

create index memories_user_taken_idx on memories (user_id, taken_at desc);
create index memories_tags_idx on memories using gin (tags);

alter table memories enable row level security;
create policy "owner only" on memories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private bucket. 50MB per file keeps uploads inside the Supabase free tier,
-- whose whole storage allowance is 1GB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories',
  'memories',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/avif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do nothing;

-- Object-level RLS: the first path segment is the owner's user id.
create policy "memories owner read" on storage.objects
  for select using (
    bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "memories owner insert" on storage.objects
  for insert with check (
    bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "memories owner update" on storage.objects
  for update using (
    bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "memories owner delete" on storage.objects
  for delete using (
    bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text
  );
