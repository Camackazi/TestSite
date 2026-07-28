export type GameFormat = 301 | 501;
export type MatchLength = 1 | 3 | 5 | 7;
export type EntryMode = "keypad" | "dartboard";
export type AppScreen = "play" | "train" | "progress" | "profile";
export type VisitFeedback = { kind: "score" | "bust" | "invalid"; value?: number; message: string };

export type Player = {
  name: string;
  score: number;
  legs: number;
  dartsThrown: number;
  pointsScored: number;
};

export type Visit = {
  playerIndex: number;
  previousScore: number;
  scored: number;
  darts: number;
  previousDartsThrown: number;
  previousPointsScored: number;
  previousLegStarter: number;
  previousPlayers?: Player[];
  legCompleted?: boolean;
  completedLegId?: string;
  completedMatchId?: string;
};

export type DartHit = { label: string; score: number; isDouble: boolean };
export type PendingCheckout = { scored: number; minDarts: 1 | 2 | 3 };

export type PlayerProfile = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type CompletedLeg = {
  id: string;
  profileId: string;
  playerName: string;
  format: GameFormat;
  darts: number;
  average: number;
  completedAt: string;
};

export type CompletedMatch = {
  id: string;
  profileId: string;
  format: GameFormat;
  bestOf: MatchLength;
  winnerName: string;
  players: Array<{ name: string; legs: number }>;
  completedAt: string;
};

export type ScoringTrainingSession = {
  id: string;
  profileId: string;
  kind: "scoring-10";
  scores: number[];
  darts: number;
  average: number;
  hundreds: number;
  oneForties: number;
  oneEighties: number;
  completedAt: string;
};

export type DoublesTrainingSession = {
  id: string;
  profileId: string;
  kind: "doubles-ladder";
  targets: number;
  hits: number;
  dartsUsed: number;
  hitRate: number;
  completedAt: string;
};

export type TrainingSession = ScoringTrainingSession | DoublesTrainingSession;

export type BetterDartsData = {
  version: 2;
  profiles: PlayerProfile[];
  activeProfileId: string;
  completedLegs: CompletedLeg[];
  completedMatches: CompletedMatch[];
  trainingSessions: TrainingSession[];
};

export type SavedGame = {
  players: Player[];
  format: GameFormat;
  playerCount: 1 | 2;
  bestOf: MatchLength;
  currentPlayer: number;
  legStarter: number;
  matchWinner: string | null;
  history: Visit[];
  started: boolean;
  profileId?: string;
};
