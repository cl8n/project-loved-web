export const enum GameMode {
  osu,
  taiko,
  catch,
  mania,
}

export const gameModes = [0, 1, 2, 3] as const;
const gameModeShortNames = ['osu', 'taiko', 'fruits', 'mania'] as const;
const gameModeLongNames = ['osu!standard', 'osu!taiko', 'osu!catch', 'osu!mania'] as const;

export function gameModeShortName(gameMode: GameMode): typeof gameModeShortNames[number] {
  return gameModeShortNames[gameMode];
}

export function gameModeFromShortName(shortName: string | null | undefined): GameMode | null {
  if (shortName == null) {
    return null;
  }

  const gameMode = (gameModeShortNames as unknown as string[]).indexOf(shortName);

  return gameMode < 0 ? null : gameMode;
}

export function gameModeLongName(gameMode: GameMode): typeof gameModeLongNames[number] {
  return gameModeLongNames[gameMode];
}
