import { GameMode } from './interfaces';

export const gameModes = [0, 1, 2, 3] as const;
export const gameModeShortNames = ['osu', 'taiko', 'fruits', 'mania'] as const;
export const gameModeLongNames = ['osu!standard', 'osu!taiko', 'osu!catch', 'osu!mania'] as const;

export function gameModeShortName(gameMode: GameMode) {
  return gameModeShortNames[gameMode];
}

export function gameModeLongName(gameMode: GameMode) {
  return gameModeLongNames[gameMode];
}
