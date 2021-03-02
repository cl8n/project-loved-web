import { GameMode } from './interfaces';

const shortNames = ['osu', 'taiko', 'fruits', 'mania'] as const;

export function gameModeShortName(gameMode: GameMode) {
  return shortNames[gameMode];
}
