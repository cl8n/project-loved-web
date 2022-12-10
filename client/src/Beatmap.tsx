import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { gameModeShortName } from 'loved-bridge/beatmaps/gameMode';
import type { IBeatmapset } from './interfaces';

interface BeatmapProps {
  beatmapset: IBeatmapset;
  gameMode?: GameMode;
}

export default function Beatmap({ beatmapset, gameMode }: BeatmapProps) {
  let link = `https://osu.ppy.sh/beatmapsets/${beatmapset.id}`;

  if (gameMode != null) {
    link += `#${gameModeShortName(gameMode)}`;
  }

  return (
    <a className='beatmap' href={link} target="_blank">
      <div className='beatmap-artist'>{beatmapset.artist}</div>
      <div className='beatmap-title'>{beatmapset.title}</div>
    </a>
  );
}
