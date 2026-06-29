import { Form, Link, useLoaderData } from "react-router";
import type { Route } from "./+types/_protected.radar.alerts";
import { Icon } from "~/lib/radar/icons";
import { relativeTime } from "~/lib/radar/format";
import { DbNotice } from "~/lib/radar/ui";
import {
  getAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  isDbConfigured,
} from "~/lib/radar/queries.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Alerts — Pain Radar" }];
}

export async function loader(_: Route.LoaderArgs) {
  if (!isDbConfigured()) return { configured: false as const };
  return { configured: true as const, alerts: await getAlerts() };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "ack") await acknowledgeAlert(Number(form.get("id")));
  else if (intent === "ackAll") await acknowledgeAllAlerts();
  return null;
}

export default function AlertsPage() {
  const data = useLoaderData<typeof loader>();
  if (!data.configured) {
    return (
      <DbNotice
        title="Alerts"
        sub="Raised when a theme's complaint volume spikes vs the prior week."
      />
    );
  }
  const { alerts } = data;
  const open = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="pain-radar screen screen-anim">
      <div className="page-head">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-sub">
            Raised when a theme's complaint volume spikes vs the prior week.
          </p>
        </div>
        {open.length > 0 && (
          <Form method="post" className="page-actions">
            <input type="hidden" name="intent" value="ackAll" />
            <button type="submit" className="btn btn-ghost">
              <Icon name="check" size={16} /> Acknowledge all
            </button>
          </Form>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="empty">
          <b>No alerts</b>
          <p>Spikes appear here once you've ingested enough history.</p>
        </div>
      ) : (
        <div className="stack">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="card rise"
              style={
                a.acknowledged
                  ? { opacity: 0.55 }
                  : {
                      borderColor: "var(--accent-line)",
                      background: "var(--accent-soft)",
                    }
              }
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  className="feed-ic"
                  style={{
                    background: a.acknowledged
                      ? "var(--surface-2)"
                      : "color-mix(in oklch, var(--accent) 18%, transparent)",
                    color: a.acknowledged ? "var(--text-3)" : "var(--accent)",
                  }}
                >
                  <Icon name="alert" size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    to={`/radar/themes/${a.topic}`}
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--text)",
                      textDecoration: "none",
                    }}
                  >
                    {a.message}
                  </Link>
                  <div className="faint mono" style={{ fontSize: 11.5, marginTop: 3 }}>
                    {relativeTime(a.created_at)}
                  </div>
                </div>
                {!a.acknowledged && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="ack" />
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="icon-btn" title="Acknowledge">
                      <Icon name="check" size={16} />
                    </button>
                  </Form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
