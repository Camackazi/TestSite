"use client";

import type { DartHit } from "@/lib/types";

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

type Props = {
  hits: DartHit[];
  onChange: (hits: DartHit[]) => void;
  onSubmit: () => void;
  submitLabel?: string;
  compact?: boolean;
  requireThreeDarts?: boolean;
};

function sectorPath(index: number, innerRadius: number, outerRadius: number) {
  const start = ((index * 18) - 99) * Math.PI / 180;
  const end = ((index * 18) - 81) * Math.PI / 180;
  const point = (radius: number, angle: number) => `${100 + radius * Math.cos(angle)},${100 + radius * Math.sin(angle)}`;
  return `M ${point(innerRadius, start)} L ${point(outerRadius, start)} A ${outerRadius} ${outerRadius} 0 0 1 ${point(outerRadius, end)} L ${point(innerRadius, end)} A ${innerRadius} ${innerRadius} 0 0 0 ${point(innerRadius, start)} Z`;
}

export default function Dartboard({ hits, onChange, onSubmit, submitLabel, compact = false, requireThreeDarts = false }: Props) {
  const addHit = (label: string, score: number, isDouble = false) => {
    if (hits.length >= 3) return;
    onChange([...hits, { label, score, isDouble }]);
  };

  const total = hits.reduce((sum, hit) => sum + hit.score, 0);

  return (
    <div className={compact ? "dartboard-component compact" : "dartboard-component"}>
      <div className="dartboard-wrap inline-dartboard">
        <svg className="dartboard-svg" viewBox="0 0 200 200" role="img" aria-label="Interactive standard dartboard">
          <circle cx="100" cy="100" r="98" className="board-surround" />
          {BOARD_ORDER.map((number, index) => {
            const alternate = index % 2 === 0;
            const lightClass = alternate ? "dark" : "light";
            const colourClass = alternate ? "red" : "green";
            return (
              <g key={number}>
                <path className={`board-segment ${lightClass}`} d={sectorPath(index, 55, 88)} onClick={() => addHit(`S${number}`, number)} />
                <path className={`board-segment ${colourClass}`} d={sectorPath(index, 48, 55)} onClick={() => addHit(`T${number}`, number * 3)} />
                <path className={`board-segment ${lightClass}`} d={sectorPath(index, 12, 48)} onClick={() => addHit(`S${number}`, number)} />
                <path className={`board-segment ${colourClass}`} d={sectorPath(index, 88, 96)} onClick={() => addHit(`D${number}`, number * 2, true)} />
                <text
                  className="board-number"
                  x={100 + 91.8 * Math.cos(((index * 18) - 90) * Math.PI / 180)}
                  y={100 + 91.8 * Math.sin(((index * 18) - 90) * Math.PI / 180)}
                >
                  {number}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="11.5" className="board-segment green" onClick={() => addHit("25", 25)} />
          <circle cx="100" cy="100" r="5.2" className="board-segment red" onClick={() => addHit("Bull", 50, true)} />
          <circle cx="100" cy="100" r="12" className="board-wire" />
          <circle cx="100" cy="100" r="48" className="board-wire" />
          <circle cx="100" cy="100" r="55" className="board-wire" />
          <circle cx="100" cy="100" r="88" className="board-wire" />
          <circle cx="100" cy="100" r="96" className="board-wire" />
        </svg>
      </div>

      <div className="dart-total-row">
        <span>Visit total</span><strong>{total}</strong>
      </div>
      <div className="dart-hit-row">
        {[0, 1, 2].map((index) => <span key={index}>{hits[index]?.label ?? `Dart ${index + 1}`}</span>)}
      </div>
      <div className="dartboard-controls">
        <button type="button" onClick={() => addHit("Miss", 0)}>Miss</button>
        <button type="button" onClick={() => onChange(hits.slice(0, -1))} disabled={!hits.length}>Undo dart</button>
        <button type="button" className="primary-button" onClick={onSubmit} disabled={!hits.length || (requireThreeDarts && hits.length !== 3)}>
          {requireThreeDarts && hits.length < 3 ? `Add ${3 - hits.length} more dart${3 - hits.length === 1 ? "" : "s"}` : (submitLabel ?? `Enter ${hits.length || 3} dart${hits.length === 1 ? "" : "s"}`)}
        </button>
      </div>
    </div>
  );
}
