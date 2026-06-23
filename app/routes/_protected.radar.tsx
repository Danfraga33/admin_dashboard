import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/_protected.radar";
import { AnimatedNumber, ScrambleText, FunnelBar } from "~/lib/radar/motion";
import { Icon } from "~/lib/radar/icons";
import { relativeTime, truncate } from "~/lib/radar/format";
import { topicLabel } from "~/lib/radar/topics";
import {
  getOverview,
  getThemes,
  getAlerts,
  getTopComplaints,
  getComplaintsBySource,
  getRuns,
  isDbConfigured,
} from "~/lib/radar/queries.server";
import { isYouTubeConfigured } from "~/lib/radar/connectors/youtube.server";
import { PLATFORM_META } from "~/lib/radar/platforms";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Pain Radar — Dashboard" }];
}

export async function loader(_: Route.LoaderArgs) {
  if (!isDbConfigured()) {
    return { configured: false as const };
  }
  const [overview, themes, alerts, topComplaints, bySource, runs] =
    await Promise.all([
      getOverview(),
      getThemes(),
      getAlerts(),
      getTopComplaints(8),
      getComplaintsBySource(),
      getRuns(),
    ]);
  return {
    configured: true as const,
    overview,
    themes,
    openAlerts: alerts.filter((a) => !a.acknowledged),
    topComplaints,
    bySource,
    runs: runs.slice(0, 6),
    youtube: isYouTubeConfigured(),
  };
}

function Spark({ data, hot }: { data: number[]; hot?: boolean }) {
  const series = data.length ? data : [2, 3, 2, 4, 3, 5, 4, 6];
  const max = Math.max(...series, 1);
  return (
    <div className="ed-spark">
      {series.map((d, i) => (
        <i
          key={i}
          className={hot && i === series.length - 1 ? "hot" : ""}
          style={{ height: `${Math.max(8, (d / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();

  if (!data.configured) {
    return (
      <div className="pain-radar screen screen-anim">
        <div className="page-head">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">
              Mine operator complaints into ranked, validated pain points.
            </p>
          </div>
        </div>
        <div className="notice">
          <b>Connect your database to begin</b>
          <p>
            Copy <code>.env.example</code> to <code>.env</code> and set{" "}
            <code>DATABASE_URL</code> to your Neon connection string. Schema and
            default sources are created automatically on first load.
          </p>
        </div>
      </div>
    );
  }

  const { overview, themes, openAlerts, topComplaints, bySource, runs, youtube } =
    data;
  const maxSourceComplaints = Math.max(...bySource.map((s) => s.complaints), 1);
  const sparkData = themes.slice(0, 12).map((t) => t.complaints);
  const last7 = themes.reduce((n, t) => n + t.last7, 0);
  const prev7 = themes.reduce((n, t) => n + t.prev7, 0);
  const deltaPct =
    prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : last7 > 0 ? 100 : 0;
  const maxComplaints = Math.max(...themes.map((t) => t.complaints), 1);

  const tickerItems = openAlerts.length
    ? openAlerts.map((a) => ({ dot: "var(--bad)", text: a.message }))
    : themes.slice(0, 6).map((t) => ({
        dot: "var(--accent)",
        text: `${t.label} — ${t.complaints} complaints`,
      }));

  return (
    <div className="pain-radar screen screen-anim dash">
      <div className="ed-head">
        <div>
          <div className="ed-eyebrow">Dashboard — Pain Radar</div>
          <ScrambleText as="h1" className="ed-headline" text="Where it hurts" />
          <p className="ed-subline">
            Operator complaints from Reddit &amp; YouTube, clustered into themes
            and ranked by volume × intensity. Last ingest{" "}
            {relativeTime(overview.lastRun)}.
          </p>
        </div>
        <div className="ed-actions">
          <Link to="/radar/sources" className="ed-btn">
            <Icon name="channels" size={15} /> Sources
          </Link>
          <Link to="/radar/alerts" className="ed-btn solid">
            <Icon name="bell" size={16} /> {overview.openAlerts} alerts
          </Link>
        </div>
      </div>

      {!youtube && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <b>YouTube not configured</b>
          <p>
            Reddit works with no keys (public API). To also mine YouTube
            comments, set <code>YOUTUBE_API_KEY</code> in <code>.env</code>, then
            hit <strong>Run ingest</strong>.
          </p>
        </div>
      )}

      <div className="ed-bento">
        <div className="ed-card ed-hero blk-green rise">
          <div className="ed-c-top">
            <span className="ed-c-eyebrow">Complaints mined</span>
            <span className="ed-c-ic">
              <Icon name="flame" size={16} />
            </span>
          </div>
          <div className="ed-c-mid">
            <div className="ed-c-value">
              <AnimatedNumber value={overview.totalComplaints} />
            </div>
          </div>
          <div className="ed-hero-foot">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="ed-delta">
                  <Icon
                    name={deltaPct >= 0 ? "arrowUp" : "arrowDown"}
                    size={13}
                    stroke={2.6}
                  />
                  {Math.abs(deltaPct)}%
                </span>
                <span className="ed-c-cap">last 7d vs prior 7d</span>
              </div>
              <span className="ed-c-cap">
                Across {overview.activeTopics} active pain themes
              </span>
            </div>
            <div style={{ flex: 1, maxWidth: 240 }}>
              <Spark data={sparkData} hot />
            </div>
          </div>
        </div>

        <div className="ed-card blk-cream ed-wide rise">
          <div className="ed-c-top">
            <span className="ed-c-eyebrow">Mentions scanned</span>
            <span className="ed-c-ic">
              <Icon name="message" size={15} />
            </span>
          </div>
          <div className="ed-c-mid">
            <div className="ed-c-value">
              <AnimatedNumber value={overview.totalMentions} />
            </div>
          </div>
          <div className="ed-c-foot">
            <span className="ed-c-cap">Posts + comments analysed</span>
            <div style={{ marginLeft: "auto", width: 180 }}>
              <Spark data={sparkData} />
            </div>
          </div>
        </div>

        <div className="ed-card blk-ink rise">
          <div className="ed-c-top">
            <span className="ed-c-eyebrow">Active themes</span>
            <span className="ed-c-ic">
              <Icon name="layers" size={15} />
            </span>
          </div>
          <div className="ed-c-mid">
            <div className="ed-c-value">
              <AnimatedNumber value={overview.activeTopics} />
            </div>
          </div>
          <div className="ed-c-foot">
            <span className="ed-c-cap">of 12 tracked categories</span>
          </div>
        </div>

        <div className="ed-card blk-clay rise">
          <div className="ed-c-top">
            <span className="ed-c-eyebrow">Open alerts</span>
            <span className="ed-c-ic">
              <Icon name="alert" size={15} />
            </span>
          </div>
          <div className="ed-c-mid">
            <div className="ed-c-value">
              <AnimatedNumber value={overview.openAlerts} />
            </div>
          </div>
          <div className="ed-c-foot">
            <span className="ed-c-cap">complaint spikes</span>
          </div>
        </div>
      </div>

      <div className="ed-zone">
        <div className="ed-zone-head">
          <h3 className="ed-zone-title">Complaints by source</h3>
          <span className="ed-zone-num">
            {bySource.length} platforms · complaints / scanned
          </span>
        </div>
        {bySource.length === 0 ? (
          <div className="empty">
            <b>No data yet</b>
            <p>
              Hit <strong>Run ingest</strong> to pull complaints from your
              connected platforms.
            </p>
          </div>
        ) : (
          <div className="funnel">
            {bySource.map((s) => {
              const meta = PLATFORM_META[s.platform];
              const rate = s.mentions
                ? Math.round((s.complaints / s.mentions) * 100)
                : 0;
              return (
                <Link
                  key={s.platform}
                  to={`/radar/sources/${s.platform}`}
                  className="theme-row"
                >
                  <FunnelBar
                    label={meta?.label ?? s.platform}
                    sub={`${s.mentions} scanned · ${s.complaints} complaints`}
                    value={s.complaints}
                    pct={(s.complaints / maxSourceComplaints) * 100}
                    color={meta?.color ?? "var(--accent)"}
                    drop={`${rate}% complaint rate`}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="ed-zone">
        <div className="ed-zone-head">
          <h3 className="ed-zone-title">Ranked pain themes</h3>
          <span className="ed-zone-num">
            {themes.length} active · volume × intensity
          </span>
        </div>
        {themes.length === 0 ? (
          <div className="empty">
            <b>No pain mined yet</b>
            <p>
              Hit <strong>Run ingest</strong> in the top bar to pull complaints
              from your sources.
            </p>
          </div>
        ) : (
          <div className="funnel">
            {themes.map((t) => (
              <Link key={t.topic} to={`/radar/themes/${t.topic}`} className="theme-row">
                <FunnelBar
                  label={t.label}
                  sub={`${t.mentions} mentions · ${t.complaints} complaints`}
                  value={t.complaints}
                  pct={(t.complaints / maxComplaints) * 100}
                  color="var(--accent)"
                  drop={`${Math.round(t.avgIntensity * 100)}% intensity`}
                />
              </Link>
            ))}
          </div>
        )}
      </div>

      {tickerItems.length > 0 && (
        <div className="ed-ticker">
          <div className="marquee">
            <div className="marquee-track">
              {[...tickerItems, ...tickerItems].map((t, i) => (
                <span className="ed-tpill" key={i}>
                  <span className="d" style={{ background: t.dot }} />
                  {t.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="ed-zone ed-split">
        <div>
          <div className="ed-zone-head">
            <h3 className="ed-zone-title">Sharpest complaints</h3>
            <span className="ed-zone-num">Highest intensity</span>
          </div>
          {topComplaints.length === 0 ? (
            <div className="empty">
              <b>Nothing yet</b>
              <p>Run ingest to surface complaints.</p>
            </div>
          ) : (
            <div className="ed-table-wrap">
              <table className="ed-table">
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th className="r">Theme</th>
                    <th className="r">Intensity</th>
                  </tr>
                </thead>
                <tbody>
                  {topComplaints.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ed-ch"
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <span
                            className="ed-ch-mark"
                            style={{
                              background:
                                m.platform === "reddit" ? "#ff4500" : "#ff0033",
                            }}
                          >
                            <Icon name={m.platform} size={16} />
                          </span>
                          <div>
                            <b>{truncate(m.title || m.body || "(comment)", 60)}</b>
                            <small>{m.author ? `u/${m.author}` : m.platform}</small>
                          </div>
                        </a>
                      </td>
                      <td className="r">
                        <Link
                          to={`/radar/themes/${m.topic}`}
                          style={{ color: "var(--ink-2)", textDecoration: "none" }}
                        >
                          {topicLabel(m.topic)}
                        </Link>
                      </td>
                      <td className="r">
                        <span className="ed-conv">
                          <span className="ed-conv-bar">
                            <i
                              style={{
                                width: `${Math.round(m.intensity * 100)}%`,
                              }}
                            />
                          </span>
                          {Math.round(m.intensity * 100)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="ed-zone-head">
            <h3 className="ed-zone-title">Recent ingest</h3>
            <span
              className="ed-zone-num"
              style={{ display: "flex", alignItems: "center", gap: 7 }}
            >
              <span className="live-dot" /> Live
            </span>
          </div>
          {runs.length === 0 ? (
            <div className="empty">
              <b>No runs yet</b>
              <p>Hit Run ingest to start.</p>
            </div>
          ) : (
            <div className="ed-timeline">
              {runs.map((r) => (
                <div className="ed-tl-item" key={r.id}>
                  <div className="ed-tl-rail">
                    <span
                      className="ed-tl-dot"
                      style={{
                        color:
                          r.status === "ok"
                            ? "var(--ok)"
                            : r.status === "error"
                              ? "var(--bad)"
                              : "var(--warn)",
                      }}
                    />
                    <span className="ed-tl-line" />
                  </div>
                  <div className="ed-tl-body">
                    <p>
                      <b>{r.source_label}</b>{" "}
                      {r.status === "error" ? (
                        <span style={{ color: "var(--bad)" }}>failed</span>
                      ) : (
                        <>
                          +{r.mentions_added} new · {r.complaints_added} complaints
                        </>
                      )}
                    </p>
                    <div className="ed-tl-time">{relativeTime(r.started_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
