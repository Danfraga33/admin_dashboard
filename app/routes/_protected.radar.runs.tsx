import { useLoaderData } from "react-router";
import type { Route } from "./+types/_protected.radar.runs";
import { Icon } from "~/lib/radar/icons";
import { Badge, DbNotice } from "~/lib/radar/ui";
import { relativeTime } from "~/lib/radar/format";
import { getRuns, isDbConfigured } from "~/lib/radar/queries.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Runs — Pain Radar" }];
}

export async function loader(_: Route.LoaderArgs) {
  if (!isDbConfigured()) return { configured: false as const };
  return { configured: true as const, runs: await getRuns() };
}

function statusIcon(status: string) {
  if (status === "ok") return { name: "checkCircle", color: "var(--ok)" };
  if (status === "error") return { name: "x", color: "var(--bad)" };
  return { name: "refresh", color: "var(--warn)" };
}

export default function RunsPage() {
  const data = useLoaderData<typeof loader>();
  if (!data.configured) {
    return (
      <DbNotice
        title="Ingest runs"
        sub="History of fetches per source — useful for spotting broken connectors."
      />
    );
  }
  const { runs } = data;

  return (
    <div className="pain-radar screen screen-anim">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ingest runs</h1>
          <p className="page-sub">
            History of fetches per source — useful for spotting broken connectors.
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="empty">
          <b>No runs yet</b>
          <p>Hit Run ingest in the top bar to start.</p>
        </div>
      ) : (
        <div className="card card-pad-0 rise">
          <table className="tbl">
            <thead>
              <tr>
                <th>Source</th>
                <th className="num">Scanned</th>
                <th className="num">Added</th>
                <th>Complaints</th>
                <th className="num">When</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => {
                const s = statusIcon(r.status);
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="ch-name">
                        <Icon
                          name={s.name}
                          size={16}
                          style={{ color: s.color }}
                          className={r.status === "running" ? "spin" : undefined}
                        />
                        <span>
                          {r.source_label ?? "—"}
                          {r.error && (
                            <small
                              className="mono"
                              style={{
                                display: "block",
                                color: "var(--bad)",
                                fontSize: 11,
                              }}
                            >
                              {r.error.slice(0, 80)}
                            </small>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="num">{r.mentions_scanned}</td>
                    <td className="num">+{r.mentions_added}</td>
                    <td>
                      <Badge kind="accent">{r.complaints_added}</Badge>
                    </td>
                    <td className="num faint">{relativeTime(r.started_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
