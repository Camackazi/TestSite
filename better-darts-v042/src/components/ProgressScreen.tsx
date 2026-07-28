"use client";

import { useMemo, useState } from "react";
import type { BetterDartsData, GameFormat, PlayerProfile } from "@/lib/types";

type Props = { data: BetterDartsData; profile: PlayerProfile };
type Filter = "all" | GameFormat;
type ChartType = "bar" | "line" | "pie";

const PERFORMANCE_BANDS = [
  { label: "Under 40", colour: "var(--red-bright)", matches: (average: number) => average < 40 },
  { label: "40–59", colour: "#d88732", matches: (average: number) => average >= 40 && average < 60 },
  { label: "60–79", colour: "var(--cream)", matches: (average: number) => average >= 60 && average < 80 },
  { label: "80+", colour: "var(--green-bright)", matches: (average: number) => average >= 80 }
];

export default function ProgressScreen({ data, profile }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const allLegs = data.completedLegs.filter((leg) => leg.profileId === profile.id);
  const legs = filter === "all" ? allLegs : allLegs.filter((leg) => leg.format === filter);
  const matches = data.completedMatches.filter((match) => match.profileId === profile.id).slice(-5).reverse();
  const training = data.trainingSessions.filter((session) => session.profileId === profile.id).slice(-4).reverse();

  const summary = useMemo(() => {
    const totalDarts = legs.reduce((sum, leg) => sum + leg.darts, 0);
    const totalPoints = legs.reduce((sum, leg) => sum + leg.format, 0);
    const average = totalDarts ? (totalPoints / totalDarts) * 3 : 0;
    const bestAverage = legs.length ? Math.max(...legs.map((leg) => leg.average)) : 0;
    const bestLeg = legs.length ? Math.min(...legs.map((leg) => leg.darts)) : 0;
    const lastFive = legs.slice(-5);
    const recentDarts = lastFive.reduce((sum, leg) => sum + leg.darts, 0);
    const recentPoints = lastFive.reduce((sum, leg) => sum + leg.format, 0);
    const recentAverage = recentDarts ? (recentPoints / recentDarts) * 3 : 0;
    return { totalLegs: legs.length, totalDarts, average, bestAverage, bestLeg, recentAverage };
  }, [legs]);

  const recent = legs.slice(-10);
  const chartMax = Math.max(60, ...recent.map((leg) => leg.average));
  const linePoints = recent.map((leg, index) => {
    const x = recent.length === 1 ? 160 : 20 + (index * 280) / (recent.length - 1);
    const y = 145 - (leg.average / chartMax) * 115;
    return { x, y, leg, index };
  });
  const bandData = PERFORMANCE_BANDS.map((band) => ({
    ...band,
    count: recent.filter((leg) => band.matches(leg.average)).length
  }));
  let pieCursor = 0;
  const pieStops = bandData.flatMap((band) => {
    const start = pieCursor;
    pieCursor += recent.length ? (band.count / recent.length) * 100 : 0;
    return [`${band.colour} ${start}%`, `${band.colour} ${pieCursor}%`];
  }).join(", ");

  return (
    <main className="landing-shell section-shell progress-shell">
      <section className="section-intro">
        <span className="status-chip">{profile.name}&apos;s progress</span>
        <h1>See what is improving.</h1>
        <p>Completed legs, matches and training sessions are combined into one player view.</p>
      </section>

      <div className="filter-row" role="group" aria-label="Progress game filter">
        {(["all", 501, 301] as Filter[]).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "All games" : value}</button>)}
      </div>

      <section className="progress-metrics expanded">
        <article><span>Legs</span><strong>{summary.totalLegs}</strong></article>
        <article><span>Overall avg</span><strong>{summary.average.toFixed(2)}</strong></article>
        <article><span>Last 5 avg</span><strong>{summary.recentAverage.toFixed(2)}</strong></article>
        <article><span>Best avg</span><strong>{summary.bestAverage.toFixed(2)}</strong></article>
        <article><span>Best leg</span><strong>{summary.bestLeg ? `${summary.bestLeg} darts` : "—"}</strong></article>
        <article><span>Total darts</span><strong>{summary.totalDarts}</strong></article>
      </section>

      <section className="progress-card">
        <div className="section-heading chart-heading">
          <div>
            <span>Recent form</span>
            <strong>{chartType === "pie" ? "Performance bands from recent legs" : "Three-dart average by leg"}</strong>
          </div>
          <label className="chart-picker">
            <span className="visually-hidden">Chart type</span>
            <select value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)} aria-label="Display recent form as">
              <option value="bar">Bar graph</option>
              <option value="line">Line graph</option>
              <option value="pie">Pie chart</option>
            </select>
          </label>
        </div>

        {!recent.length ? (
          <div className="empty-progress"><strong>No completed legs in this view</strong><span>Finish a 301 or 501 leg to start your graph.</span></div>
        ) : chartType === "bar" ? (
          <div className="progress-chart" aria-label="Recent three-dart averages shown as bars">
            {recent.map((leg, index) => (
              <div className="progress-bar-column" key={leg.id}>
                <span className="progress-value">{leg.average.toFixed(1)}</span>
                <div className="progress-bar-track"><div className="progress-bar" style={{ height: `${Math.max(6, (leg.average / chartMax) * 100)}%` }} /></div>
                <small>{index + 1}</small>
              </div>
            ))}
          </div>
        ) : chartType === "line" ? (
          <div className="line-chart-wrap" aria-label="Recent three-dart averages shown as a line">
            <svg className="line-chart" viewBox="0 0 320 170" role="img">
              <title>Three-dart average for the last {recent.length} legs</title>
              {[30, 87.5, 145].map((y) => <line key={y} x1="20" x2="300" y1={y} y2={y} className="chart-guide" />)}
              <polyline points={linePoints.map((point) => `${point.x},${point.y}`).join(" ")} className="average-line" />
              {linePoints.map(({ x, y, leg, index }) => (
                <g key={leg.id}>
                  <circle cx={x} cy={y} r="4" className="average-point" />
                  <text x={x} y={Math.max(14, y - 9)} className="line-value">{leg.average.toFixed(1)}</text>
                  <text x={x} y="163" className="line-index">{index + 1}</text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div className="pie-chart-layout" aria-label="Recent legs grouped into average bands">
            <div className="pie-chart" style={{ background: `conic-gradient(${pieStops})` }}>
              <div><strong>{recent.length}</strong><span>recent legs</span></div>
            </div>
            <div className="pie-legend">
              {bandData.map((band) => (
                <div key={band.label}><span style={{ background: band.colour }} /><strong>{band.label}</strong><small>{band.count} leg{band.count === 1 ? "" : "s"}</small></div>
              ))}
            </div>
          </div>
        )}
        <p className="chart-caption">{chartType === "pie" ? "The pie chart groups the last ten legs into average ranges." : "Leg 1 is the oldest shown; the final point is your most recent leg."}</p>
      </section>

      <section className="progress-card">
        <div className="section-heading"><div><span>Match history</span><strong>Latest completed matches</strong></div><small>{data.completedMatches.filter((match) => match.profileId === profile.id).length} total</small></div>
        <div className="recent-legs">
          {matches.map((match) => {
            const profilePlayer = match.players.find((player) => player.name === profile.name) ?? match.players[0];
            const opponent = match.players.find((player) => player.name !== profilePlayer.name);
            const won = match.winnerName === profilePlayer.name;
            return <div key={match.id}><div><strong>{won ? "Win" : "Loss"} vs {opponent?.name ?? "Opponent"}</strong><span>{match.format} · Best of {match.bestOf} · {new Date(match.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div><div><strong>{profilePlayer.legs}–{opponent?.legs ?? 0}</strong><span>{match.winnerName} won</span></div></div>;
          })}
          {!matches.length && <span className="muted-copy">Completed two-player matches will be listed here.</span>}
        </div>
      </section>

      <section className="progress-card">
        <div className="section-heading"><div><span>Training</span><strong>Latest practice results</strong></div><small>{data.trainingSessions.filter((session) => session.profileId === profile.id).length} total</small></div>
        <div className="recent-legs">
          {training.map((session) => <div key={session.id}><div><strong>{session.kind === "scoring-10" ? "10-visit scoring" : "Doubles ladder"}</strong><span>{new Date(session.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div><div><strong>{session.kind === "scoring-10" ? session.average.toFixed(2) : `${session.hitRate.toFixed(0)}%`}</strong><span>{session.kind === "scoring-10" ? `${session.hundreds} scores of 100+` : `${session.hits}/${session.targets} hits`}</span></div></div>)}
          {!training.length && <span className="muted-copy">Training sessions will appear here once completed.</span>}
        </div>
      </section>
    </main>
  );
}
