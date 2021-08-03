import { GameMode, IBeatmapset } from './interfaces';
import { gameModeShortName } from './osu-helpers';

type BeatmapProps = {
  beatmapset: IBeatmapset;
  gameMode?: GameMode;
};

export default function Beatmap({ beatmapset, gameMode }: BeatmapProps) {
  let link = `https://osu.ppy.sh/beatmapsets/${beatmapset.id}`;

  if (gameMode != null)
    link += `#${gameModeShortName(gameMode)}`;

  return (
    <a className='beatmap' href={link}>
      <div className='beatmap-artist'>{beatmapset.artist}</div>
      <div className='beatmap-title'>{beatmapset.title}</div>
    </a>
  );
}
