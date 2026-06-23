import { Form, useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/_protected.radar.sources";
import { Icon } from "~/lib/radar/icons";
import { Badge } from "~/lib/radar/ui";
import {
  getSourcesWithStats,
  addSource,
  toggleSource,
  deleteSource,
} from "~/lib/radar/queries.server";
import type { Platform } from "~/lib/radar/types";

const SOURCE_TYPES = [
  "reddit",
  "youtube",
  "hackernews",
  "stackexchange",
  "github",
  "shopifycommunity",
];

const LABEL_PREFIX: Record<Platform, string> = {
  reddit: "r/",
  youtube: "YT:",
  hackernews: "HN:",
  stackexchange: "SO:",
  github: "GH:",
  shopifycommunity: "SC:",
};

const TYPE_OPTIONS: Array<{ value: Platform; label: string; placeholder: string }> = [
  { value: "reddit", label: "Reddit (subreddit)", placeholder: "e.g. shopify" },
  { value: "youtube", label: "YouTube (search query)", placeholder: "e.g. amazon fba mistakes" },
  { value: "hackernews", label: "Hacker News (search)", placeholder: "e.g. ecommerce" },
  { value: "stackexchange", label: "Stack Exchange ([site:]tag)", placeholder: "e.g. woocommerce" },
  { value: "github", label: "GitHub (issue search)", placeholder: "e.g. repo:saleor/saleor is:issue" },
  { value: "shopifycommunity", label: "Shopify Community (category)", placeholder: "e.g. shopify-apps/186" },
];

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sources — Pain Radar" }];
}

export async function loader(_: Route.LoaderArgs) {
  return { sources: await getSourcesWithStats() };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "add") {
    const raw = String(form.get("type") ?? "reddit");
    const type = (SOURCE_TYPES.includes(raw) ? raw : "reddit") as Platform;
    const query = String(form.get("query") ?? "").trim();
    if (query) {
      const normalized = type === "reddit" ? query.replace(/^r\//, "") : query;
      const label =
        type === "reddit" ? `r/${normalized}` : `${LABEL_PREFIX[type]} ${normalized}`;
      await addSource(type, normalized, label);
    }
  } else if (intent === "toggle") {
    await toggleSource(Number(form.get("id")));
  } else if (intent === "delete") {
    await deleteSource(Number(form.get("id")));
  }
  return null;
}

function SourceIngestButton({ id }: { id: number }) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";
  return (
    <fetcher.Form method="post" action="/api/ingest">
      <input type="hidden" name="sourceId" value={id} />
      <button
        type="submit"
        className="icon-btn"
        disabled={busy}
        title="Run this source now"
      >
        <Icon name={busy ? "refresh" : "play"} size={16} className={busy ? "spin" : undefined} />
      </button>
    </fetcher.Form>
  );
}

export default function SourcesPage() {
  const { sources } = useLoaderData<typeof loader>();

  return (
    <div className="pain-radar screen screen-anim">
      <div className="page-head">
        <div>
          <h1 className="page-title">Sources</h1>
          <p className="page-sub">
            Subreddits and YouTube search queries the radar scans for complaints.
          </p>
        </div>
      </div>

      <div className="card rise" style={{ marginBottom: 24 }}>
        <Form
          method="post"
          style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}
        >
          <input type="hidden" name="intent" value="add" />
          <div className="field" style={{ width: 200 }}>
            <label>Type</label>
            <select name="type" className="select">
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label>Subreddit name / search query</label>
            <input
              name="query"
              required
              className="input"
              placeholder="e.g. shopify  ·  amazon fba mistakes"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            <Icon name="plus" size={16} /> Add source
          </button>
        </Form>
      </div>

      {sources.length === 0 ? (
        <div className="empty">
          <b>No sources yet</b>
          <p>Add one above.</p>
        </div>
      ) : (
        <div className="card card-pad-0 rise">
          <table className="tbl">
            <thead>
              <tr>
                <th>Source</th>
                <th>Query</th>
                <th className="num">Complaints / total</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} style={{ opacity: s.enabled ? 1 : 0.5 }}>
                  <td>
                    <span className="ch-name">
                      <Badge kind={s.type === "reddit" ? "warn" : "bad"}>
                        <Icon name={s.type} size={12} />
                        {s.type}
                      </Badge>
                      {s.label}
                    </span>
                  </td>
                  <td className="mono faint">{s.query}</td>
                  <td className="num">
                    {s.complaints}
                    <span className="faint">/{s.mentions}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <SourceIngestButton id={s.id} />
                      <Form method="post">
                        <input type="hidden" name="intent" value="toggle" />
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="icon-btn"
                          title={s.enabled ? "Disable" : "Enable"}
                        >
                          <Icon name="power" size={16} />
                        </button>
                      </Form>
                      <Form
                        method="post"
                        onSubmit={(e) => {
                          if (
                            !confirm(
                              `Delete ${s.label}? Its mentions are removed too.`,
                            )
                          )
                            e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="icon-btn" title="Delete">
                          <Icon name="trash" size={16} />
                        </button>
                      </Form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
