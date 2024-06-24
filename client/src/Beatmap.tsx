import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { gameModeShortName } from 'loved-bridge/beatmaps/gameMode';
import type { Beatmapset } from 'loved-bridge/tables';

interface BeatmapProps {
  beatmapset: Beatmapset;
  gameMode?: GameMode;
}

export default function Beatmap({ beatmapset, gameMode }: BeatmapProps) {
  let link = `https://osu.ppy.sh/beatmapsets/${beatmapset.id}`;

  if (gameMode != null) {
    link += `#${gameModeShortName(gameMode)}`;
  }

  return (
    <a className='beatmap' href={link}>
      <div className='beatmap-artist'>{beatmapset.artist}</div>
      <div className='beatmap-title'>{beatmapset.title}</div>
    </a>
  );
}
