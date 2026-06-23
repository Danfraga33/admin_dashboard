import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/_protected.radar.themes.$topic";
import { Gauge, AnimatedNumber } from "~/lib/radar/motion";
import { Icon } from "~/lib/radar/icons";
import { Badge } from "~/lib/radar/ui";
import { relativeTime, truncate } from "~/lib/radar/format";
import { getTheme } from "~/lib/radar/queries.server";
import { topicLabel } from "~/lib/radar/topics";

export function meta({ data }: Route.MetaArgs) {
  const label = data?.label ?? "Theme";
  return [{ title: `${label} — Pain Radar` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const topic = params.topic;
  const { theme, mentions } = await getTheme(topic);
  return { topic, label: topicLabel(topic), theme, mentions };
}

export default function ThemePage() {
  const { topic, label, theme, mentions } = useLoaderData<typeof loader>();

  return (
    <div className="pain-radar screen screen-anim">
      <Link
        to="/radar"
        className="faint"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          textDecoration: "none",
          marginBottom: 18,
        }}
      >
        <Icon name="chevronRight" size={14} style={{ transform: "rotate(180deg)" }} />
        Back to dashboard
      </Link>

      <div className="page-head">
        <div>
          <h1 className="page-title">{label}</h1>
          <p className="page-sub mono">{topic}</p>
        </div>
        {theme && (
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 650,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <AnimatedNumber value={theme.complaints} />
              </div>
              <div className="faint" style={{ fontSize: 12 }}>
                complaints · {theme.mentions} mentions
              </div>
            </div>
            <Gauge
              value={Math.round(theme.avgIntensity * 100)}
              size={132}
              label="intensity"
              sub="avg intensity"
            />
          </div>
        )}
      </div>

      {mentions.length === 0 ? (
        <div className="empty">
          <b>No complaints in this theme yet</b>
          <p>Run ingest to pull more, or this topic hasn't surfaced pain yet.</p>
        </div>
      ) : (
        <div className="stack">
          {mentions.map((m) => (
            <div key={m.id} className="card mention rise">
              <div className="mention-head">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mention-title"
                >
                  {m.title ? truncate(m.title, 140) : "(comment)"}
                  <Icon name="external" size={14} />
                </a>
                <Badge kind={m.platform === "reddit" ? "warn" : "bad"}>
                  <Icon name={m.platform} size={12} />
                  {m.platform}
                </Badge>
              </div>

              {m.body && (
                <p className="mention-body">{truncate(m.body, 320)}</p>
              )}

              <div className="mention-foot">
                <span className="intensity">
                  <span className="bar">
                    <i style={{ width: `${Math.round(m.intensity * 100)}%` }} />
                  </span>
                  <span className="pct">{Math.round(m.intensity * 100)}</span>
                </span>
                <span className="mf-stat">
                  <Icon name="arrowUp" size={13} /> {m.score}
                </span>
                <span className="mf-stat">
                  <Icon name="message" size={13} /> {m.num_comments}
                </span>
                <span>
                  {m.author ? `u/${m.author}` : "—"} · {relativeTime(m.created_utc)}
                </span>
                {m.keywords && (
                  <span className="kw-chips">
                    {m.keywords
                      .split(", ")
                      .slice(0, 5)
                      .map((k) => (
                        <span key={k} className="kw-chip">
                          {k}
                        </span>
                      ))}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
