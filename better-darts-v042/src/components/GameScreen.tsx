"use client";

import Dartboard from "./Dartboard";
import type { DartHit, EntryMode, GameFormat, MatchLength, PendingCheckout, Player, VisitFeedback } from "@/lib/types";

const QUICK_SCORES = [26, 41, 45, 60, 81, 100, 140, 180];

type Props = {
  format: GameFormat;
  playerCount: 1 | 2;
  bestOf: MatchLength;
  players: Player[];
  currentPlayer: number;
  checkoutHint: string;
  entryMode: EntryMode;
  entry: string;
  dartHits: DartHit[];
  message: string;
  visitFeedback: VisitFeedback | null;
  pendingCheckout: PendingCheckout | null;
  matchWinner: string | null;
  canUndo: boolean;
  onExit: () => void;
  onUndo: () => void;
  onEntryMode: (mode: EntryMode) => void;
  onEntry: (value: string) => void;
  onDartHits: (hits: DartHit[]) => void;
  onSubmitScore: (score?: number) => void;
  onSubmitDartboard: () => void;
  onConfirmCheckout: (darts: 1 | 2 | 3) => void;
  onCheckoutBust: () => void;
  onCancelCheckout: () => void;
  onNewMatch: () => void;
  onViewProgress: () => void;
};

export default function GameScreen(props: Props) {
  const {
    format, playerCount, bestOf, players, currentPlayer, checkoutHint, entryMode, entry, dartHits,
    message, visitFeedback, pendingCheckout, matchWinner, canUndo, onExit, onUndo, onEntryMode,
    onEntry, onDartHits, onSubmitScore, onSubmitDartboard, onConfirmCheckout, onCheckoutBust,
    onCancelCheckout, onNewMatch, onViewProgress
  } = props;
  const active = players[currentPlayer] ?? players[0]!;

  return (
    <main className="game-shell">
      <header className="game-header">
        <button className="icon-button" onClick={onExit} aria-label="Exit game">×</button>
        <div><p className="eyebrow">LIVE GAME</p><p className="game-format">{format} · {playerCount === 1 ? "Solo" : `Best of ${bestOf}`}</p></div>
        <button className="icon-button" onClick={onUndo} disabled={!canUndo} aria-label="Undo">↶</button>
      </header>

      <section className={`scoreboard ${playerCount === 1 ? "solo" : ""}`}>
        {players.map((player, index) => (
          <article className={`player-card ${index === currentPlayer ? "current" : ""}`} key={`${player.name}-${index}`}>
            <div className="player-meta"><span>{player.name}</span><strong>{player.legs} legs</strong></div>
            <strong className="remaining-score">{player.score}</strong>
            <div className="leg-stats"><span><small>Darts</small><strong>{player.dartsThrown}</strong></span><span><small>3-dart avg</small><strong>{player.dartsThrown ? ((player.pointsScored / player.dartsThrown) * 3).toFixed(2) : "0.00"}</strong></span></div>
            {index === currentPlayer && <span className="throwing-indicator">THROWING</span>}
          </article>
        ))}
      </section>

      <section className={`checkout-card ${checkoutHint.startsWith("No") ? "unavailable" : ""}`}><span>Checkout</span><strong>{checkoutHint}</strong></section>

      <section className={`entry-panel ${entryMode === "dartboard" ? "dartboard-entry-panel" : ""}`}>
        <div className="entry-display">
          <span>{active.name}&apos;s visit</span>
          <div className="entry-mode-switch" aria-label="Score entry method">
            <button className={entryMode === "keypad" ? "active" : ""} onClick={() => onEntryMode("keypad")}><span>123</span><span>Keypad</span></button>
            <button className={entryMode === "dartboard" ? "active" : ""} onClick={() => onEntryMode("dartboard")}><span>🎯</span><span>Dartboard</span></button>
          </div>
          <strong>{entryMode === "keypad" ? (entry || "0") : dartHits.reduce((sum, hit) => sum + hit.score, 0)}</strong>
        </div>

        {entryMode === "keypad" ? (
          <>
            <div className="number-grid">
              {[1,2,3,4,5,6,7,8,9].map((number) => <button key={number} onClick={() => onEntry(`${entry}${number}`.slice(0,3))}>{number}</button>)}
              <button onClick={() => onEntry("")}>C</button><button onClick={() => onEntry(`${entry}0`.slice(0,3))}>0</button><button onClick={() => onEntry(entry.slice(0,-1))}>⌫</button>
            </div>
            <div className="entry-actions"><button className="no-score-button" onClick={() => onSubmitScore(0)}>No score</button><button className="primary-button score-button" onClick={() => onSubmitScore()}>Enter score</button></div>
          </>
        ) : <Dartboard hits={dartHits} onChange={onDartHits} onSubmit={onSubmitDartboard} />}
      </section>

      {entryMode === "keypad" && <section className="quick-row" aria-label="Quick scores">{QUICK_SCORES.map((score) => <button key={score} onClick={() => onSubmitScore(score)}>{score}</button>)}</section>}
      <p className="status-message" aria-live="polite">{message}</p>

      {visitFeedback && (
        <div className={`visit-feedback ${visitFeedback.kind}`} aria-live="assertive">
          <strong>
            <span className="feedback-label">{visitFeedback.message}</span>
            {visitFeedback.value !== undefined && <span className="feedback-value">{visitFeedback.value}</span>}
          </strong>
        </div>
      )}
      {pendingCheckout && <div className="confirmation-modal" role="dialog" aria-modal="true"><div className="confirmation-card"><span className="status-chip">Checkout</span><h2>How many darts completed it?</h2><p>Confirm the winning double so the leg average and dart count are accurate.</p><div className="checkout-dart-grid">{([1,2,3] as const).filter((darts) => darts >= pendingCheckout.minDarts).map((darts) => <button key={darts} onClick={() => onConfirmCheckout(darts)}>{darts} dart{darts === 1 ? "" : "s"}</button>)}</div><button className="bust-button" onClick={onCheckoutBust}>Final dart was not a double — bust</button><button className="ghost-button modal-cancel" onClick={onCancelCheckout}>Cancel</button></div></div>}
      {matchWinner && <div className="confirmation-modal" role="dialog" aria-modal="true"><div className="confirmation-card match-complete-card"><span className="status-chip">Match complete</span><h2>{matchWinner} wins</h2><div className="match-score-summary">{players.map((player) => <div key={player.name}><span>{player.name}</span><strong>{player.legs}</strong></div>)}</div><button className="primary-button" onClick={onNewMatch}>New match</button><button className="secondary-button" onClick={onViewProgress}>View progress</button><button className="ghost-button modal-cancel" onClick={onUndo}>Undo winning visit</button></div></div>}
    </main>
  );
}
