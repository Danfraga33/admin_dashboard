import { useState } from "react";
import { data, useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/_protected.radar.ideas";
import { ScrambleText } from "~/lib/radar/motion";
import { Icon } from "~/lib/radar/icons";
import { requireSession } from "~/lib/session.server";
import type { Tables } from "~/lib/database.types";

type Idea = Tables<"business_ideas">;

const CRITERIA = [
  { key: "who_pays", label: "Who pays?", question: "Who is the customer holding the credit card?", icon: "users" },
  { key: "pain", label: "Pain", question: "What expensive problem do they have?", icon: "flame" },
  { key: "frequency", label: "Frequency", question: "How often does it occur?", icon: "repeat" },
  { key: "willingness_to_pay", label: "Willingness to pay", question: "What is the problem worth?", icon: "card" },
  { key: "retention", label: "Retention", question: "Why would they keep paying?", icon: "history" },
  { key: "distribution", label: "Distribution", question: "How do I reach 100 customers?", icon: "send" },
  { key: "gross_margin", label: "Gross margin", question: "Can delivery become increasingly cheap?", icon: "trend" },
  { key: "scale", label: "Scale", question: "Can $10M revenue exist without 500 employees?", icon: "rocket" },
  { key: "moat", label: "Moat", question: "What gets stronger as the business grows?", icon: "shield" },
  {
    key: "expansion",
    label: "Expansion",
    question: "Can the first product eventually lead to more products?",
    icon: "layers",
    critical: true,
    note: "A $10M company often isn't created by one tiny product.",
  },
] as const;

type CriterionKey = (typeof CRITERIA)[number]["key"];

const STATUSES = [
  { id: "building", label: "Building", color: "var(--ok)" },
  { id: "validating", label: "Validating", color: "var(--warn)" },
  { id: "exploring", label: "Exploring", color: "var(--info)" },
  { id: "seed", label: "Seed", color: "var(--text-3)" },
  { id: "parked", label: "Parked", color: "var(--bad)" },
] as const;

function statusMeta(id: string) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[3];
}

function tickedKeys(idea: Idea): CriterionKey[] {
  return CRITERIA.filter((c) => (idea[c.key] ?? "").trim().length > 0).map((c) => c.key);
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Pain Radar — Idea Board" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, responseHeaders } = await requireSession(request);
  const { data: ideas } = await supabase
    .from("business_ideas")
    .select("*")
    .order("updated_at", { ascending: false });
  return data({ ideas: ideas ?? [] }, { headers: responseHeaders });
}

export async function action({ request }: Route.ActionArgs) {
  const { session, supabase, responseHeaders } = await requireSession(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const fields = {
    title: String(formData.get("title") ?? "").trim() || "Untitled idea",
    one_liner: text("one_liner"),
    status: String(formData.get("status") ?? "seed"),
    notes: text("notes"),
    ...Object.fromEntries(CRITERIA.map((c) => [c.key, text(c.key)])),
  };

  if (intent === "create") {
    const { error } = await supabase
      .from("business_ideas")
      .insert({ ...fields, user_id: session.user.id });
    if (error) console.error("create-idea error:", error);
  }

  if (intent === "update") {
    const { error } = await supabase
      .from("business_ideas")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", String(formData.get("id")));
    if (error) console.error("update-idea error:", error);
  }

  if (intent === "delete") {
    const { error } = await supabase
      .from("business_ideas")
      .delete()
      .eq("id", String(formData.get("id")));
    if (error) console.error("delete-idea error:", error);
  }

  return data({ ok: true }, { headers: responseHeaders });
}

function IdeaCard({ idea, onOpen, delay }: { idea: Idea; onOpen: () => void; delay: number }) {
  const ticked = tickedKeys(idea);
  const st = statusMeta(idea.status);
  const complete = ticked.length === CRITERIA.length;
  return (
    <button
      type="button"
      className="ib-card rise"
      style={{ animationDelay: `${delay}ms` }}
      onClick={onOpen}
    >
      <div className="ib-card-top">
        <span className="ib-status">
          <i style={{ background: st.color }} />
          {st.label}
        </span>
        <span className={`ib-score ${complete ? "done" : ""}`}>
          {complete && <Icon name="checkCircle" size={13} />}
          {ticked.length}/{CRITERIA.length}
        </span>
      </div>
      <b className="ib-title">{idea.title}</b>
      <p className="ib-liner">{idea.one_liner || "No one-liner yet."}</p>
      <div className="ib-boxes" aria-label={`${ticked.length} of ${CRITERIA.length} boxes ticked`}>
        {CRITERIA.map((c) => (
          <i
            key={c.key}
            className={ticked.includes(c.key) ? "on" : ""}
            title={c.label}
          />
        ))}
      </div>
      <div className="ib-foot">
        <span>{new Date(idea.updated_at).toLocaleDateString()}</span>
        {idea.notes && (
          <span className="ib-note-flag">
            <Icon name="edit" size={12} /> notes
          </span>
        )}
      </div>
    </button>
  );
}

function IdeaModal({ idea, onClose }: { idea: Idea | null; onClose: () => void }) {
  const saveFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const isNew = idea === null;

  const [filled, setFilled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      CRITERIA.map((c) => [c.key, Boolean(idea && (idea[c.key] ?? "").trim())]),
    ),
  );
  const tickedCount = CRITERIA.filter((c) => filled[c.key]).length;

  return (
    <div className="ib-scrim" onClick={onClose}>
      <div className="ib-modal" onClick={(e) => e.stopPropagation()}>
        <saveFetcher.Form method="post" className="ib-form" onSubmit={onClose}>
          <input type="hidden" name="intent" value={isNew ? "create" : "update"} />
          {idea && <input type="hidden" name="id" value={idea.id} />}

          <div className="ib-m-head">
            <input
              name="title"
              className="input ib-m-title"
              defaultValue={idea?.title ?? ""}
              placeholder="Idea name"
              required
              autoFocus={isNew}
            />
            <span className={`ib-score ${tickedCount === CRITERIA.length ? "done" : ""}`}>
              {tickedCount}/{CRITERIA.length} boxes
            </span>
            <div className="ib-m-tools">
              {idea && (
                <button
                  type="button"
                  className="ib-icon-btn danger"
                  title="Delete idea"
                  onClick={() => {
                    if (!window.confirm("Delete this idea?")) return;
                    deleteFetcher.submit(
                      { intent: "delete", id: idea.id },
                      { method: "post" },
                    );
                    onClose();
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
              <button type="button" className="ib-icon-btn" onClick={onClose} title="Close">
                ×
              </button>
            </div>
          </div>

          <div className="ib-m-sub">
            <select name="status" className="select" defaultValue={idea?.status ?? "seed"}>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              name="one_liner"
              className="input"
              defaultValue={idea?.one_liner ?? ""}
              placeholder="One-liner — what is it, in a sentence?"
            />
          </div>

          <div className="ib-m-body">
            <div className="ib-crits">
              {CRITERIA.map((c, i) => (
                <div
                  key={c.key}
                  className={`ib-crit ${filled[c.key] ? "is-filled" : ""} ${"critical" in c && c.critical ? "is-critical" : ""}`}
                >
                  <div className="ib-crit-head">
                    <span className="ib-crit-ic">
                      <Icon name={c.icon} size={15} />
                    </span>
                    <div className="ib-crit-meta">
                      <b>
                        {String(i + 1).padStart(2, "0")} · {c.label}
                      </b>
                      <small>{c.question}</small>
                    </div>
                    {"critical" in c && c.critical && (
                      <span className="ib-crit-star">critical</span>
                    )}
                    <span className="ib-crit-tick" aria-hidden="true">
                      <Icon name="check" size={13} />
                    </span>
                  </div>
                  <textarea
                    name={c.key}
                    rows={2}
                    defaultValue={idea?.[c.key] ?? ""}
                    placeholder="Unanswered — box stays unticked."
                    onChange={(e) =>
                      setFilled((f) => ({
                        ...f,
                        [c.key]: e.target.value.trim().length > 0,
                      }))
                    }
                  />
                  {"note" in c && c.note && <p className="ib-crit-note">{c.note}</p>}
                </div>
              ))}
            </div>

            <div className="ib-notes">
              <div className="ib-crit-head">
                <span className="ib-crit-ic">
                  <Icon name="edit" size={15} />
                </span>
                <div className="ib-crit-meta">
                  <b>Notes</b>
                  <small>Scratchpad — links, numbers, objections, next moves.</small>
                </div>
              </div>
              <textarea
                name="notes"
                rows={4}
                defaultValue={idea?.notes ?? ""}
                placeholder="Anything that doesn't fit a box."
              />
            </div>
          </div>

          <div className="ib-m-foot">
            <span className="ib-m-hint">
              {tickedCount === CRITERIA.length
                ? "All boxes ticked — this one earns a build."
                : `${CRITERIA.length - tickedCount} box${CRITERIA.length - tickedCount === 1 ? "" : "es"} still open.`}
            </span>
            <button type="submit" className="btn btn-primary">
              {isNew ? "Add idea" : "Save"}
            </button>
          </div>
        </saveFetcher.Form>
      </div>
    </div>
  );
}

export default function IdeaBoard() {
  const { ideas } = useLoaderData<typeof loader>();
  const [modal, setModal] = useState<{ idea: Idea | null } | null>(null);

  const statusRank = (id: string) => {
    const i = STATUSES.findIndex((s) => s.id === id);
    return i === -1 ? STATUSES.length : i;
  };
  const sorted = [...(ideas as Idea[])].sort(
    (a, b) =>
      statusRank(a.status) - statusRank(b.status) ||
      +new Date(b.updated_at) - +new Date(a.updated_at),
  );
  const completeCount = sorted.filter(
    (i) => tickedKeys(i).length === CRITERIA.length,
  ).length;

  return (
    <div className="pain-radar screen screen-anim dash">
      <div className="ed-head">
        <div>
          <div className="ed-eyebrow">Method · Idea filter</div>
          <ScrambleText as="h1" className="ed-headline" text="Idea Board" />
          <p className="ed-subline">
            Every idea has to tick all {CRITERIA.length} boxes before it earns a
            build. {sorted.length} on the board · {completeCount} fully ticked.
          </p>
        </div>
        <div className="ed-actions">
          <button
            type="button"
            className="ed-btn solid"
            onClick={() => setModal({ idea: null })}
          >
            <Icon name="plus" size={15} /> New idea
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty">
          <b>No ideas yet</b>
          <p>
            Add the first one and run it through the {CRITERIA.length}-box
            filter.
          </p>
        </div>
      ) : (
        <div className="ib-grid">
          {sorted.map((idea, i) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              delay={i * 60}
              onOpen={() => setModal({ idea })}
            />
          ))}
        </div>
      )}

      {modal && (
        <IdeaModal idea={modal.idea} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
