"use client";

import { useEffect, useMemo, useState } from "react";
import GameScreen from "@/components/GameScreen";
import SetupScreen from "@/components/SetupScreen";
import SiteChrome from "@/components/SiteChrome";
import ProfileScreen from "@/components/ProfileScreen";
import ProgressScreen from "@/components/ProgressScreen";
import TrainingScreen from "@/components/TrainingScreen";
import { CHECKOUTS } from "./checkouts";
import { loadBetterDartsData, loadSavedGame, newId, saveBetterDartsData, saveGame } from "@/lib/storage";
import type { AppScreen, BetterDartsData, DartHit, EntryMode, GameFormat, MatchLength, PendingCheckout, Player, SavedGame, TrainingSession, Visit, VisitFeedback } from "@/lib/types";

const DART_VALUES = Array.from(new Set([
  0, 25, 50,
  ...Array.from({ length: 20 }, (_, index) => index + 1),
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 2),
  ...Array.from({ length: 20 }, (_, index) => (index + 1) * 3)
]));

const POSSIBLE_VISIT_TOTALS = new Set<number>();
for (const first of DART_VALUES) {
  for (const second of DART_VALUES) {
    for (const third of DART_VALUES) POSSIBLE_VISIT_TOTALS.add(first + second + third);
  }
}

const initialData: BetterDartsData = {
  version: 2,
  profiles: [{ id: "local-profile", name: "Player 1", createdAt: "", updatedAt: "" }],
  activeProfileId: "local-profile",
  completedLegs: [],
  completedMatches: [],
  trainingSessions: []
};

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>("play");
  const [data, setData] = useState<BetterDartsData>(initialData);
  const [hydrated, setHydrated] = useState(false);
  const [started, setStarted] = useState(false);
  const [format, setFormat] = useState<GameFormat>(501);
  const [playerCount, setPlayerCount] = useState<1 | 2>(2);
  const [bestOf, setBestOf] = useState<MatchLength>(5);
  const [players, setPlayers] = useState<Player[]>([
    { name: "Player 1", score: 501, legs: 0, dartsThrown: 0, pointsScored: 0 },
    { name: "Player 2", score: 501, legs: 0, dartsThrown: 0, pointsScored: 0 }
  ]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [legStarter, setLegStarter] = useState(0);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [entry, setEntry] = useState("");
  const [history, setHistory] = useState<Visit[]>([]);
  const [message, setMessage] = useState("Best of 5 · First to 3 · Double out");
  const [visitFeedback, setVisitFeedback] = useState<VisitFeedback | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>("keypad");
  const [dartHits, setDartHits] = useState<DartHit[]>([]);

  const activeProfile = data.profiles.find((profile) => profile.id === data.activeProfileId) ?? data.profiles[0]!;

  useEffect(() => {
    const loaded = loadBetterDartsData();
    setData(loaded);
    const savedEntryMode = window.localStorage.getItem("better-darts-entry-mode");
    if (savedEntryMode === "keypad" || savedEntryMode === "dartboard") setEntryMode(savedEntryMode);

    const saved = loadSavedGame();
    if (saved && (!saved.profileId || saved.profileId === loaded.activeProfileId)) {
      setPlayers((saved.players ?? []).map((player) => ({ ...player, dartsThrown: player.dartsThrown ?? 0, pointsScored: player.pointsScored ?? 0 })));
      setFormat(saved.format ?? 501);
      setPlayerCount(saved.playerCount ?? saved.players?.length ?? 2);
      setBestOf(saved.bestOf ?? 5);
      setCurrentPlayer(saved.currentPlayer ?? 0);
      setLegStarter(saved.legStarter ?? 0);
      setMatchWinner(saved.matchWinner ?? null);
      setHistory(saved.history ?? []);
      setStarted(saved.started ?? false);
      if (saved.started) setMessage("Game restored from this device");
    } else {
      setPlayers((current) => current.map((player, index) => index === 0 ? { ...player, name: loaded.profiles.find((profile) => profile.id === loaded.activeProfileId)?.name ?? player.name } : player));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveBetterDartsData(data);
  }, [data, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const game: SavedGame = { players, format, playerCount, bestOf, currentPlayer, legStarter, matchWinner, history, started, profileId: activeProfile.id };
    saveGame(game);
  }, [players, format, playerCount, bestOf, currentPlayer, legStarter, matchWinner, history, started, activeProfile.id, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("better-darts-entry-mode", entryMode);
  }, [entryMode, hydrated]);

  useEffect(() => {
    if (!started) {
      setPlayers((current) => current.map((player, index) => index === 0 ? { ...player, name: activeProfile.name } : player));
    }
  }, [activeProfile.id, activeProfile.name, started]);

  const active = players[currentPlayer] ?? players[0]!;
  const checkoutHint = useMemo(() => active.score > 170 ? "No checkout available" : CHECKOUTS[active.score] ?? "No checkout available", [active.score]);

  function updateData(next: BetterDartsData) {
    setData(next);
  }

  function choosePlayerCount(count: 1 | 2) {
    setPlayerCount(count);
    setPlayers((current) => count === 1
      ? [{ ...(current[0] ?? { name: activeProfile.name, legs: 0, dartsThrown: 0, pointsScored: 0 }), score: format }]
      : [
          { ...(current[0] ?? { name: activeProfile.name, legs: 0, dartsThrown: 0, pointsScored: 0 }), score: format },
          { ...(current[1] ?? { name: "Player 2", legs: 0, dartsThrown: 0, pointsScored: 0 }), score: format }
        ]
    );
  }

  function chooseFormat(nextFormat: GameFormat) {
    setFormat(nextFormat);
    setPlayers((current) => current.map((player) => ({ ...player, score: nextFormat, dartsThrown: 0, pointsScored: 0 })));
  }

  function chooseEntryMode(mode: EntryMode) {
    setEntryMode(mode);
    setEntry("");
    setDartHits([]);
  }

  function beginGame() {
    setPlayers((current) => current.slice(0, playerCount).map((player, index) => ({ ...player, name: index === 0 ? activeProfile.name : player.name.trim() || `Player ${index + 1}`, score: format, legs: 0, dartsThrown: 0, pointsScored: 0 })));
    setCurrentPlayer(0);
    setLegStarter(0);
    setMatchWinner(null);
    setPendingCheckout(null);
    setHistory([]);
    setMessage(playerCount === 1 ? "Solo practice · Double out" : `Best of ${bestOf} · First to ${Math.ceil(bestOf / 2)} · Double out`);
    setStarted(true);
  }

  function flashVisitFeedback(feedback: VisitFeedback) {
    setVisitFeedback(feedback);
    window.setTimeout(() => setVisitFeedback(null), feedback.kind === "score" ? 700 : 900);
  }

  function submitScore(value?: number, dartsUsed = 3, finalDartWasDouble?: boolean) {
    const scored = value ?? Number(entry);
    if (!Number.isInteger(scored) || scored < 0 || scored > 180) {
      setMessage("Enter a whole-number score between 0 and 180");
      flashVisitFeedback({ kind: "invalid", value: Number.isFinite(scored) ? scored : undefined, message: "INVALID" });
      setEntry("");
      return;
    }

    if (!POSSIBLE_VISIT_TOTALS.has(scored)) {
      setMessage(`${scored} cannot be scored with three darts`);
      flashVisitFeedback({ kind: "invalid", value: scored, message: "IMPOSSIBLE" });
      setEntry("");
      return;
    }

    const previousScore = active.score;
    const previousDartsThrown = active.dartsThrown;
    const previousPointsScored = active.pointsScored;
    const requestedDarts = Math.max(1, Math.min(3, dartsUsed));
    const remaining = previousScore - scored;

    if (remaining === 0 && finalDartWasDouble === undefined) {
      const route = CHECKOUTS[previousScore];
      if (!route) finalDartWasDouble = false;
      else {
        const minDarts = Math.max(1, Math.min(3, route.split("·").length)) as 1 | 2 | 3;
        setPendingCheckout({ scored, minDarts });
        return;
      }
    }

    const bust = remaining < 0 || remaining === 1 || (remaining === 0 && finalDartWasDouble === false);
    const darts = bust ? 3 : requestedDarts;

    if (bust) {
      flashVisitFeedback({ kind: "bust", value: scored, message: "BUST" });
      setHistory((items) => [...items, { playerIndex: currentPlayer, previousScore, scored: 0, darts, previousDartsThrown, previousPointsScored, previousLegStarter: legStarter, previousPlayers: players.map((player) => ({ ...player })) }]);
      setPlayers((current) => current.map((player, index) => index === currentPlayer ? { ...player, dartsThrown: player.dartsThrown + 3 } : player));
      setMessage(`${active.name} busts — score remains ${previousScore}`);
      setCurrentPlayer((currentPlayer + 1) % players.length);
      setEntry("");
      return;
    }

    flashVisitFeedback({ kind: "score", value: scored, message: "SCORE" });

    if (remaining === 0) {
      const completedLegId = newId("leg");
      const finalDarts = active.dartsThrown + darts;
      const finalPoints = active.pointsScored + scored;
      const finalAverage = finalDarts ? (finalPoints / finalDarts) * 3 : 0;
      const nextLegs = active.legs + 1;
      const firstTo = Math.ceil(bestOf / 2);
      const hasWonMatch = playerCount === 2 && nextLegs >= firstTo;
      const nextStarter = playerCount === 1 ? 0 : (legStarter + 1) % players.length;
      const completedMatchId = hasWonMatch ? newId("match") : undefined;

      setHistory((items) => [...items, { playerIndex: currentPlayer, previousScore, scored, darts, previousDartsThrown, previousPointsScored, previousLegStarter: legStarter, previousPlayers: players.map((player) => ({ ...player })), legCompleted: true, completedLegId: currentPlayer === 0 ? completedLegId : undefined, completedMatchId }]);

      if (currentPlayer === 0) {
        setData((current) => ({
          ...current,
          completedLegs: [...current.completedLegs, { id: completedLegId, profileId: activeProfile.id, playerName: activeProfile.name, format, darts: finalDarts, average: finalAverage, completedAt: new Date().toISOString() }]
        }));
      }

      const finalPlayers = players.map((player, index) => ({ ...player, legs: index === currentPlayer ? player.legs + 1 : player.legs }));
      if (hasWonMatch && completedMatchId) {
        setData((current) => ({
          ...current,
          completedMatches: [...current.completedMatches, { id: completedMatchId, profileId: activeProfile.id, format, bestOf, winnerName: active.name, players: finalPlayers.map((player) => ({ name: player.name, legs: player.legs })), completedAt: new Date().toISOString() }]
        }));
      }

      setPlayers((current) => current.map((player, index) => index === currentPlayer
        ? { ...player, score: format, legs: player.legs + 1, dartsThrown: 0, pointsScored: 0 }
        : { ...player, score: format, dartsThrown: 0, pointsScored: 0 }
      ));
      setLegStarter(nextStarter);
      setCurrentPlayer(nextStarter);
      if (hasWonMatch) {
        setMatchWinner(active.name);
        const opponentLegs = finalPlayers.find((_, index) => index !== currentPlayer)?.legs ?? 0;
        setMessage(`${active.name} wins the match ${nextLegs}–${opponentLegs}`);
      } else {
        setMessage(`${active.name} completes the leg in ${finalDarts} darts · ${finalAverage.toFixed(2)} average`);
      }
    } else {
      setHistory((items) => [...items, { playerIndex: currentPlayer, previousScore, scored, darts, previousDartsThrown, previousPointsScored, previousLegStarter: legStarter, previousPlayers: players.map((player) => ({ ...player })) }]);
      setPlayers((current) => current.map((player, index) => index === currentPlayer ? { ...player, score: remaining, dartsThrown: player.dartsThrown + darts, pointsScored: player.pointsScored + scored } : player));
      setMessage(`${active.name} scored ${scored}`);
      setCurrentPlayer((currentPlayer + 1) % players.length);
    }
    setEntry("");
  }

  function confirmTypedCheckout(darts: 1 | 2 | 3) {
    if (!pendingCheckout) return;
    const scored = pendingCheckout.scored;
    setPendingCheckout(null);
    submitScore(scored, darts, true);
  }

  function markTypedCheckoutAsBust() {
    if (!pendingCheckout) return;
    const scored = pendingCheckout.scored;
    setPendingCheckout(null);
    submitScore(scored, 3, false);
  }

  function submitDartboardVisit() {
    if (!dartHits.length) return;
    const total = dartHits.reduce((sum, hit) => sum + hit.score, 0);
    submitScore(total, dartHits.length, dartHits.at(-1)?.isDouble ?? false);
    setDartHits([]);
  }

  function undo() {
    const last = history.at(-1);
    if (!last) return;
    if (last.previousPlayers?.length) {
      setPlayers(last.previousPlayers.map((player) => ({ ...player })));
    } else {
      setPlayers((current) => current.map((player, index) => index === last.playerIndex
        ? { ...player, score: last.previousScore, dartsThrown: last.previousDartsThrown, pointsScored: last.previousPointsScored, legs: last.legCompleted ? Math.max(0, player.legs - 1) : player.legs }
        : last.legCompleted ? { ...player, score: format, dartsThrown: 0, pointsScored: 0 } : player
      ));
    }
    setData((current) => ({
      ...current,
      completedLegs: last.completedLegId ? current.completedLegs.filter((leg) => leg.id !== last.completedLegId) : current.completedLegs,
      completedMatches: last.completedMatchId ? current.completedMatches.filter((match) => match.id !== last.completedMatchId) : current.completedMatches
    }));
    setMatchWinner(null);
    setLegStarter(last.previousLegStarter ?? 0);
    setCurrentPlayer(last.playerIndex);
    setHistory((items) => items.slice(0, -1));
    setMessage("Last visit undone");
  }

  function completeTraining(session: TrainingSession) {
    setData((current) => ({ ...current, trainingSessions: [...current.trainingSessions, session] }));
  }

  if (started) {
    return <GameScreen
      format={format}
      playerCount={playerCount}
      bestOf={bestOf}
      players={players}
      currentPlayer={currentPlayer}
      checkoutHint={checkoutHint}
      entryMode={entryMode}
      entry={entry}
      dartHits={dartHits}
      message={message}
      visitFeedback={visitFeedback}
      pendingCheckout={pendingCheckout}
      matchWinner={matchWinner}
      canUndo={history.length > 0}
      onExit={() => setStarted(false)}
      onUndo={undo}
      onEntryMode={chooseEntryMode}
      onEntry={setEntry}
      onDartHits={setDartHits}
      onSubmitScore={(score) => submitScore(score)}
      onSubmitDartboard={submitDartboardVisit}
      onConfirmCheckout={confirmTypedCheckout}
      onCheckoutBust={markTypedCheckoutAsBust}
      onCancelCheckout={() => setPendingCheckout(null)}
      onNewMatch={() => { setStarted(false); setMatchWinner(null); setScreen("play"); }}
      onViewProgress={() => { setStarted(false); setMatchWinner(null); setScreen("progress"); }}
    />;
  }

  const chrome = <SiteChrome active={screen} profile={activeProfile} onSelect={setScreen} />;

  if (screen === "train") return <>{chrome}<TrainingScreen profile={activeProfile} sessions={data.trainingSessions} entryMode={entryMode} onEntryModeChange={chooseEntryMode} onComplete={completeTraining} /></>;
  if (screen === "progress") return <>{chrome}<ProgressScreen data={data} profile={activeProfile} /></>;
  if (screen === "profile") return <>{chrome}<ProfileScreen data={data} onChange={updateData} /></>;

  return <>{chrome}<SetupScreen
    profile={activeProfile}
    format={format}
    playerCount={playerCount}
    bestOf={bestOf}
    players={players}
    entryMode={entryMode}
    onFormat={chooseFormat}
    onPlayerCount={choosePlayerCount}
    onBestOf={setBestOf}
    onPlayers={setPlayers}
    onEntryMode={chooseEntryMode}
    onStart={beginGame}
  /></>;
}
