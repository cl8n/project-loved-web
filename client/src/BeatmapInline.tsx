import type { GameMode, IBeatmapset } from './interfaces';
import { gameModeShortName } from './osu-helpers';

interface BeatmapInlineProps {
  artist?: string;
  beatmapset: IBeatmapset;
  gameMode?: GameMode;
  showCreator?: boolean;
  title?: string;
}

export function BeatmapInline(props: BeatmapInlineProps) {
  let link = `https://osu.ppy.sh/beatmapsets/${props.beatmapset.id}`;

  if (props.gameMode != null)
    link += `#${gameModeShortName(props.gameMode)}`;

  return (
    <span>
      <a href={link}>
        {props.artist ?? props.beatmapset.artist} - {props.title ?? props.beatmapset.title}
      </a>
      {props.showCreator &&
        <>
          {' ('}
          <a href={`https://osu.ppy.sh/users/${props.beatmapset.creator_id}`}>
            {props.beatmapset.creator_name}
          </a>
          )
        </>
      }
    </span>
  );
}
