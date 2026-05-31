import { useState } from 'react'
import { data, useFetcher, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import {
  Dumbbell, Footprints, UtensilsCrossed, Plus, Trash2, Pencil,
  ChevronDown, Check, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Day = { id: string; name: string; label: string | null; position: number }
type Exercise = { id: string; day_id: string; name: string; sets: string | null; reps: string | null; position: number }
type Cardio = { id: string; label: string; cadence: string | null; position: number }
type Meal = { id: string; name: string; items: string | null; position: number }
type Targets = {
  id: string; calorie_min: number; calorie_max: number; weight_kg: number; water_litres: string
}

// ─── Seed (first load only) ─────────────────────────────────────────────────────
// Mon Upper · Tue Lower · Wed Rest · Thu Push · Fri Pull · Sat Legs · Sun Rest
const SEED_DAYS: Array<{ name: string; label: string; exercises: string[] }> = [
  { name: 'Monday', label: 'Upper', exercises: ['Decline', 'Incline DB', 'Shoulder Press', 'Isolation Chest / Shoulder', 'Arm Super Set', 'Calf Raises'] },
  { name: 'Tuesday', label: 'Lower', exercises: ['Adductor', 'Hamstring Curls', 'Hack Squat', 'Leg Press', 'Leg Extension', 'Calf Raise'] },
  { name: 'Wednesday', label: 'Rest', exercises: [] },
  { name: 'Thursday', label: 'Push', exercises: ['Flat Bench Press', 'Incline DB Press', 'Shoulder Press', 'Lateral Raise', 'Tricep Pushdown', 'Overhead Tricep Extension'] },
  { name: 'Friday', label: 'Pull', exercises: ['Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Face Pull', 'Bicep Curl', 'Hammer Curl'] },
  { name: 'Saturday', label: 'Legs', exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Extension', 'Hamstring Curl', 'Calf Raise'] },
  { name: 'Sunday', label: 'Rest', exercises: [] },
]
const SEED_CARDIO = [
  { label: 'Sprints', cadence: '1x / week' },
  { label: 'Running / Walk', cadence: 'daily' },
]
const SEED_MEALS = [
  { name: 'Breakfast', items: '4 eggs\nToast' },
  { name: 'Post-Workout Shake', items: 'Banana\nPeanut butter\n2 scoops whey\nMilk' },
  { name: 'Lunch', items: '250g brown rice\n2 chicken thighs' },
  { name: 'Dinner', items: '250g brown rice\n2 chicken thighs' },
]

// ─── Loader ─────────────────────────────────────────────────────────────────────
export async function loader({ request }: LoaderFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const uid = session.user.id

  let { data: days } = await supabase.from('fitness_days').select('*').order('position', { ascending: true })

  // Each table seeds independently when empty — no shared guard, so a partial
  // reset (e.g. wiping only fitness_days) can't double-insert the others.
  if ((days?.length ?? 0) === 0) {
    for (let i = 0; i < SEED_DAYS.length; i++) {
      const d = SEED_DAYS[i]
      const { data: dayRow } = await supabase
        .from('fitness_days')
        .insert({ user_id: uid, name: d.name, label: d.label, position: i })
        .select('id')
        .single()
      if (dayRow && d.exercises.length) {
        await supabase.from('fitness_exercises').insert(
          d.exercises.map((name, j) => ({ user_id: uid, day_id: dayRow.id, name, position: j })),
        )
      }
    }
    days = (await supabase.from('fitness_days').select('*').order('position', { ascending: true })).data
  }

  const { count: cardioCount } = await supabase.from('fitness_cardio').select('*', { count: 'exact', head: true })
  if ((cardioCount ?? 0) === 0) {
    await supabase.from('fitness_cardio').insert(SEED_CARDIO.map((c, i) => ({ ...c, user_id: uid, position: i })))
  }

  const { count: mealsCount } = await supabase.from('fitness_meals').select('*', { count: 'exact', head: true })
  if ((mealsCount ?? 0) === 0) {
    await supabase.from('fitness_meals').insert(SEED_MEALS.map((m, i) => ({ ...m, user_id: uid, position: i })))
  }

  const { count: targetsCount } = await supabase.from('fitness_targets').select('*', { count: 'exact', head: true })
  if ((targetsCount ?? 0) === 0) {
    await supabase.from('fitness_targets').insert({ user_id: uid })
  }

  const [{ data: exercises }, { data: cardio }, { data: meals }, { data: targets }] = await Promise.all([
    supabase.from('fitness_exercises').select('*').order('position', { ascending: true }),
    supabase.from('fitness_cardio').select('*').order('position', { ascending: true }),
    supabase.from('fitness_meals').select('*').order('position', { ascending: true }),
    supabase.from('fitness_targets').select('*').maybeSingle(),
  ])

  return data(
    { days: days ?? [], exercises: exercises ?? [], cardio: cardio ?? [], meals: meals ?? [], targets },
    { headers: responseHeaders },
  )
}

// ─── Action ─────────────────────────────────────────────────────────────────────
export async function action({ request }: ActionFunctionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request)
  const uid = session.user.id
  const fd = await request.formData()
  const intent = String(fd.get('intent'))
  const str = (k: string) => String(fd.get(k) ?? '')
  const opt = (k: string) => str(k) || null

  switch (intent) {
    case 'add-exercise': {
      const day_id = str('day_id')
      const { data: last } = await supabase.from('fitness_exercises')
        .select('position').eq('day_id', day_id).order('position', { ascending: false }).limit(1).maybeSingle()
      await supabase.from('fitness_exercises').insert({
        user_id: uid, day_id, name: str('name'), sets: opt('sets'), reps: opt('reps'),
        position: (last?.position ?? -1) + 1,
      })
      break
    }
    case 'update-exercise':
      await supabase.from('fitness_exercises')
        .update({ name: str('name'), sets: opt('sets'), reps: opt('reps') })
        .eq('id', str('id'))
      break
    case 'delete-exercise':
      await supabase.from('fitness_exercises').delete().eq('id', str('id'))
      break
    case 'update-targets':
      await supabase.from('fitness_targets').update({
        calorie_min: Number(str('calorie_min')) || 0,
        calorie_max: Number(str('calorie_max')) || 0,
        weight_kg: Number(str('weight_kg')) || 0,
        water_litres: str('water_litres'),
        updated_at: new Date().toISOString(),
      }).eq('id', str('id'))
      break
    case 'add-cardio': {
      const { data: last } = await supabase.from('fitness_cardio')
        .select('position').order('position', { ascending: false }).limit(1).maybeSingle()
      await supabase.from('fitness_cardio').insert({
        user_id: uid, label: str('label'), cadence: opt('cadence'),
        position: (last?.position ?? -1) + 1,
      })
      break
    }
    case 'update-cardio':
      await supabase.from('fitness_cardio').update({ label: str('label'), cadence: opt('cadence') }).eq('id', str('id'))
      break
    case 'delete-cardio':
      await supabase.from('fitness_cardio').delete().eq('id', str('id'))
      break
    case 'add-meal': {
      const { data: last } = await supabase.from('fitness_meals')
        .select('position').order('position', { ascending: false }).limit(1).maybeSingle()
      await supabase.from('fitness_meals').insert({
        user_id: uid, name: str('name') || 'New Meal', items: opt('items'),
        position: (last?.position ?? -1) + 1,
      })
      break
    }
    case 'update-meal':
      await supabase.from('fitness_meals')
        .update({ name: str('name'), items: opt('items'), updated_at: new Date().toISOString() })
        .eq('id', str('id'))
      break
    case 'delete-meal':
      await supabase.from('fitness_meals').delete().eq('id', str('id'))
      break
  }

  return data({ ok: true }, { headers: responseHeaders })
}

// ─── UI primitives ──────────────────────────────────────────────────────────────
const inputCls = 'bg-input border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring'
const iconBtn = 'text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-1 pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">{children}</p>
}

// ─── Targets strip ──────────────────────────────────────────────────────────────
function TargetsStrip({ targets }: { targets: Targets | null }) {
  const fetcher = useFetcher()
  const [editing, setEditing] = useState(false)
  if (!targets) return null

  if (editing) {
    return (
      <fetcher.Form method="post" onSubmit={() => setEditing(false)} className="mb-8">
        <input type="hidden" name="intent" value="update-targets" />
        <input type="hidden" name="id" value={targets.id} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="bg-card border border-border rounded-lg p-4">
            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Calories</span>
            <span className="flex items-center gap-1">
              <input name="calorie_min" type="number" defaultValue={targets.calorie_min} className={`${inputCls} w-20`} />
              <span className="text-muted-foreground">–</span>
              <input name="calorie_max" type="number" defaultValue={targets.calorie_max} className={`${inputCls} w-20`} />
            </span>
          </label>
          <label className="bg-card border border-border rounded-lg p-4">
            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Weight (kg)</span>
            <input name="weight_kg" type="number" step="0.1" defaultValue={targets.weight_kg} className={`${inputCls} w-24`} />
          </label>
          <label className="bg-card border border-border rounded-lg p-4">
            <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Water</span>
            <input name="water_litres" defaultValue={targets.water_litres} className={`${inputCls} w-full`} />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button type="submit" className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium hover:opacity-90 cursor-pointer">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Cancel</button>
        </div>
      </fetcher.Form>
    )
  }

  const Card = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-chart-1/50 transition-colors">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  )

  return (
    <div onClick={() => setEditing(true)} title="Click to edit" className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8 cursor-pointer">
      <Card label="Calories" value={`${targets.calorie_min}–${targets.calorie_max}`} />
      <Card label="Weight (kg)" value={String(targets.weight_kg)} />
      <Card label="Water" value={targets.water_litres} />
    </div>
  )
}

// ─── Exercise row ───────────────────────────────────────────────────────────────
function ExerciseRow({ ex }: { ex: Exercise }) {
  const fetcher = useFetcher()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <fetcher.Form method="post" onSubmit={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-2 border-b border-border last:border-0">
        <input type="hidden" name="intent" value="update-exercise" />
        <input type="hidden" name="id" value={ex.id} />
        <input name="name" defaultValue={ex.name} required className={`${inputCls} flex-1`} />
        <input name="sets" defaultValue={ex.sets ?? ''} placeholder="sets" className={`${inputCls} w-14`} />
        <input name="reps" defaultValue={ex.reps ?? ''} placeholder="reps" className={`${inputCls} w-16`} />
        <button type="submit" className={iconBtn}><Check size={15} /></button>
        <button type="button" onClick={() => setEditing(false)} className={iconBtn}><X size={15} /></button>
      </fetcher.Form>
    )
  }

  const detail = [ex.sets, ex.reps].filter(Boolean).join(' × ')
  return (
    <div className="group flex items-center gap-2 px-3 py-2 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <span className="flex-1 text-sm text-foreground">{ex.name}</span>
      {detail && <span className="font-mono text-xs text-muted-foreground">{detail}</span>}
      <button onClick={() => setEditing(true)} className={`${iconBtn} opacity-0 group-hover:opacity-100`}><Pencil size={13} /></button>
      <fetcher.Form method="post" className="flex">
        <input type="hidden" name="intent" value="delete-exercise" />
        <input type="hidden" name="id" value={ex.id} />
        <button type="submit" className={`${iconBtn} opacity-0 group-hover:opacity-100 hover:text-destructive-foreground`}><Trash2 size={13} /></button>
      </fetcher.Form>
    </div>
  )
}

// ─── Day card (collapsed by default, click header to expand) ────────────────────
function DayCard({ day, exercises }: { day: Day; exercises: Exercise[] }) {
  const fetcher = useFetcher()
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(false)
  const isRest = (day.label ?? '').toLowerCase() === 'rest'

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/20 transition-colors cursor-pointer"
      >
        <ChevronDown size={15} className={`shrink-0 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
        <h3 className="text-sm font-semibold text-foreground">{day.name}</h3>
        {day.label && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${isRest ? 'bg-muted text-muted-foreground' : 'bg-chart-1/15 text-chart-1'}`}>
            {day.label}
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {isRest ? 'Rest' : `${exercises.length} ex`}
        </span>
      </button>

      {open && (
        <div className="border-t border-border">
          <div>
            {exercises.map((ex) => (
              <ExerciseRow key={ex.id} ex={ex} />
            ))}
            {exercises.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground/60 italic">No exercises.</p>
            )}
          </div>
          {adding ? (
            <fetcher.Form method="post" onSubmit={() => setAdding(false)} className="flex items-center gap-1.5 px-3 py-2 bg-muted/20">
              <input type="hidden" name="intent" value="add-exercise" />
              <input type="hidden" name="day_id" value={day.id} />
              <input name="name" placeholder="Exercise" required autoFocus className={`${inputCls} flex-1`} />
              <input name="sets" placeholder="sets" className={`${inputCls} w-14`} />
              <input name="reps" placeholder="reps" className={`${inputCls} w-16`} />
              <button type="submit" className={iconBtn}><Check size={15} /></button>
              <button type="button" onClick={() => setAdding(false)} className={iconBtn}><X size={15} /></button>
            </fetcher.Form>
          ) : (
            <button onClick={() => setAdding(true)} className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors cursor-pointer">
              <Plus size={13} /> Add exercise
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Cardio card ────────────────────────────────────────────────────────────────
function CardioCard({ cardio }: { cardio: Cardio[] }) {
  const fetcher = useFetcher()
  const [adding, setAdding] = useState(false)

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Footprints size={15} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Conditioning</h3>
      </div>
      <div>
        {cardio.map((c) => (
          <div key={c.id} className="group flex items-center gap-2 px-3 py-2 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
            <span className="flex-1 text-sm text-foreground">{c.label}</span>
            {c.cadence && <span className="font-mono text-xs text-muted-foreground">{c.cadence}</span>}
            <fetcher.Form method="post" className="flex">
              <input type="hidden" name="intent" value="delete-cardio" />
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className={`${iconBtn} opacity-0 group-hover:opacity-100 hover:text-destructive-foreground`}><Trash2 size={13} /></button>
            </fetcher.Form>
          </div>
        ))}
      </div>
      {adding ? (
        <fetcher.Form method="post" onSubmit={() => setAdding(false)} className="flex items-center gap-1.5 px-3 py-2 bg-muted/20">
          <input type="hidden" name="intent" value="add-cardio" />
          <input name="label" placeholder="Activity" required autoFocus className={`${inputCls} flex-1`} />
          <input name="cadence" placeholder="cadence" className={`${inputCls} w-24`} />
          <button type="submit" className={iconBtn}><Check size={15} /></button>
          <button type="button" onClick={() => setAdding(false)} className={iconBtn}><X size={15} /></button>
        </fetcher.Form>
      ) : (
        <button onClick={() => setAdding(true)} className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors cursor-pointer">
          <Plus size={13} /> Add activity
        </button>
      )}
    </div>
  )
}

// ─── Meal card ──────────────────────────────────────────────────────────────────
function MealCard({ meal }: { meal: Meal }) {
  const fetcher = useFetcher()
  const [editing, setEditing] = useState(false)
  const items = (meal.items ?? '').split('\n').filter(Boolean)

  if (editing) {
    return (
      <fetcher.Form method="post" onSubmit={() => setEditing(false)} className="bg-card border border-border rounded-lg p-3 space-y-2">
        <input type="hidden" name="intent" value="update-meal" />
        <input type="hidden" name="id" value={meal.id} />
        <input name="name" defaultValue={meal.name} required className={`${inputCls} w-full font-semibold`} />
        <textarea name="items" defaultValue={meal.items ?? ''} rows={4} placeholder="One item per line" className={`${inputCls} w-full resize-none`} />
        <div className="flex items-center gap-2">
          <button type="submit" className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-sm font-medium hover:opacity-90 cursor-pointer">Save</button>
          <button type="button" onClick={() => setEditing(false)} className={iconBtn}><X size={15} /></button>
        </div>
      </fetcher.Form>
    )
  }

  return (
    <div className="group bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <h3 className="flex-1 text-sm font-semibold text-foreground">{meal.name}</h3>
        <button onClick={() => setEditing(true)} className={`${iconBtn} opacity-0 group-hover:opacity-100`}><Pencil size={13} /></button>
        <fetcher.Form method="post" className="flex">
          <input type="hidden" name="intent" value="delete-meal" />
          <input type="hidden" name="id" value={meal.id} />
          <button type="submit" className={`${iconBtn} opacity-0 group-hover:opacity-100 hover:text-destructive-foreground`}><Trash2 size={13} /></button>
        </fetcher.Form>
      </div>
      <ul className="px-3 py-2.5 space-y-1">
        {items.length ? items.map((it, i) => (
          <li key={i} className="text-sm text-foreground">{it}</li>
        )) : <li className="text-sm text-muted-foreground/60 italic">No items</li>}
      </ul>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function Fitness() {
  const { days, exercises, cardio, meals, targets } = useLoaderData<typeof loader>()
  const addMeal = useFetcher()
  const exByDay = (id: string) => (exercises as Exercise[]).filter((e) => e.day_id === id)

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-2">
        <Dumbbell size={20} className="text-foreground" />
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Gym</h1>
      </div>

      <TargetsStrip targets={targets as Targets | null} />

      <section>
        <SectionLabel>Training · Week</SectionLabel>
        <div className="space-y-2">
          {(days as Day[]).map((day) => (
            <DayCard key={day.id} day={day} exercises={exByDay(day.id)} />
          ))}
        </div>
        <div className="mt-4 max-w-md">
          <CardioCard cardio={cardio as Cardio[]} />
        </div>
      </section>

      <section>
        <SectionLabel>
          Diet · {targets ? `${(targets as Targets).calorie_min}–${(targets as Targets).calorie_max} kcal` : ''}
        </SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(meals as Meal[]).map((m) => (
            <MealCard key={m.id} meal={m} />
          ))}
        </div>
        <addMeal.Form method="post" className="mt-3 flex items-center gap-2">
          <input type="hidden" name="intent" value="add-meal" />
          <input name="name" placeholder="New meal name" required className={`${inputCls} w-48`} />
          <button type="submit" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <UtensilsCrossed size={14} /> Add meal
          </button>
        </addMeal.Form>
      </section>
    </div>
  )
}
