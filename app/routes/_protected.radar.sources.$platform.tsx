import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/_protected.radar.sources.$platform";
import { AnimatedNumber } from "~/lib/radar/motion";
import { Icon } from "~/lib/radar/icons";
import { Badge } from "~/lib/radar/ui";
import { relativeTime, truncate } from "~/lib/radar/format";
import { getPlatformComplaints } from "~/lib/radar/queries.server";
import { isPlatform, platformLabel } from "~/lib/radar/platforms";
import { topicLabel } from "~/lib/radar/topics";

export function meta({ data }: Route.MetaArgs) {
  const label = data?.label ?? "Source";
  return [{ title: `${label} complaints — Pain Radar` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const raw = params.platform ?? "";
  if (!isPlatform(raw)) {
    return { valid: false as const, platform: raw, label: raw };
  }
  const { stat, mentions } = await getPlatformComplaints(raw);
  return {
    valid: true as const,
    platform: raw,
    label: platformLabel(raw),
    stat,
    mentions,
  };
}

export default function SourcePage() {
  const data = useLoaderData<typeof loader>();

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

      {!data.valid ? (
        <div className="empty">
          <b>Unknown source</b>
          <p>
            <span className="mono">{data.platform}</span> isn&apos;t a tracked
            platform.
          </p>
        </div>
      ) : (
        <>
          <div className="page-head">
            <div>
              <h1 className="page-title">
                <span
                  className="ed-ch-mark"
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    verticalAlign: "-6px",
                    marginRight: 10,
                    width: 30,
                    height: 30,
                  }}
                >
                  <Icon name={data.platform} size={18} />
                </span>
                {data.label}
              </h1>
              <p className="page-sub mono">{data.platform}</p>
            </div>
            {data.stat && (
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 650,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <AnimatedNumber value={data.stat.complaints} />
                </div>
                <div className="faint" style={{ fontSize: 12 }}>
                  complaints · {data.stat.mentions} scanned
                </div>
              </div>
            )}
          </div>

          {data.mentions.length === 0 ? (
            <div className="empty">
              <b>No complaints from {data.label} yet</b>
              <p>Run ingest to pull more from this platform.</p>
            </div>
          ) : (
            <div className="stack">
              {data.mentions.map((m) => (
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
                    <Link
                      to={`/radar/themes/${m.topic}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Badge kind="warn">{topicLabel(m.topic)}</Badge>
                    </Link>
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
                      {m.author ? `u/${m.author}` : "—"} ·{" "}
                      {relativeTime(m.created_utc)}
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
        </>
      )}
    </div>
  );
}
