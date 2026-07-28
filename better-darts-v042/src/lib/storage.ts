import type { BetterDartsData, CompletedLeg, PlayerProfile, SavedGame } from "./types";

export const DATA_KEY = "better-darts-data-v2";
export const GAME_KEY = "better-darts-game";
export const ENTRY_MODE_KEY = "better-darts-entry-mode";
const LEGACY_PROGRESS_KEY = "better-darts-progress";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultData(defaultName = "Player 1"): BetterDartsData {
  const now = new Date().toISOString();
  const profile: PlayerProfile = {
    id: makeId("profile"),
    name: defaultName.trim() || "Player 1",
    createdAt: now,
    updatedAt: now
  };
  return {
    version: 2,
    profiles: [profile],
    activeProfileId: profile.id,
    completedLegs: [],
    completedMatches: [],
    trainingSessions: []
  };
}

export function loadBetterDartsData(): BetterDartsData {
  const stored = window.localStorage.getItem(DATA_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as BetterDartsData;
      if (parsed.version === 2 && parsed.profiles?.length) {
        return {
          ...parsed,
          completedLegs: Array.isArray(parsed.completedLegs) ? parsed.completedLegs : [],
          completedMatches: Array.isArray(parsed.completedMatches) ? parsed.completedMatches : [],
          trainingSessions: Array.isArray(parsed.trainingSessions) ? parsed.trainingSessions : []
        };
      }
    } catch {
      window.localStorage.removeItem(DATA_KEY);
    }
  }

  const migrated = createDefaultData();
  const legacyProgress = window.localStorage.getItem(LEGACY_PROGRESS_KEY);
  if (legacyProgress) {
    try {
      const legs = JSON.parse(legacyProgress) as Array<Omit<CompletedLeg, "profileId">>;
      migrated.completedLegs = legs.map((leg) => ({ ...leg, profileId: migrated.activeProfileId }));
    } catch {
      // Leave corrupt legacy data untouched so it can still be manually recovered.
    }
  }
  saveBetterDartsData(migrated);
  return migrated;
}

export function saveBetterDartsData(data: BetterDartsData) {
  window.localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function loadSavedGame(): SavedGame | null {
  const saved = window.localStorage.getItem(GAME_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as SavedGame;
  } catch {
    window.localStorage.removeItem(GAME_KEY);
    return null;
  }
}

export function saveGame(game: SavedGame) {
  window.localStorage.setItem(GAME_KEY, JSON.stringify(game));
}

export function exportData(data: BetterDartsData) {
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), app: "Better Darts", data }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `better-darts-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<BetterDartsData> {
  const parsed = JSON.parse(await file.text()) as { data?: BetterDartsData } | BetterDartsData;
  const data = "data" in parsed && parsed.data ? parsed.data : parsed as BetterDartsData;
  if (data.version !== 2 || !Array.isArray(data.profiles) || !data.profiles.length) {
    throw new Error("This is not a valid Better Darts backup.");
  }
  const normalized: BetterDartsData = {
    ...data,
    completedLegs: Array.isArray(data.completedLegs) ? data.completedLegs : [],
    completedMatches: Array.isArray(data.completedMatches) ? data.completedMatches : [],
    trainingSessions: Array.isArray(data.trainingSessions) ? data.trainingSessions : []
  };
  if (!normalized.profiles.some((profile) => profile.id === normalized.activeProfileId)) {
    normalized.activeProfileId = normalized.profiles[0].id;
  }
  saveBetterDartsData(normalized);
  return normalized;
}

export function newId(prefix: string) {
  return makeId(prefix);
}
