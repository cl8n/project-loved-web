import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { gameModeShortName } from 'loved-bridge/beatmaps/gameMode';
import type { IBeatmapset } from './interfaces';

interface BeatmapInlineProps {
  artist?: string | null;
  beatmapset: IBeatmapset;
  gameMode?: GameMode;
  showCreator?: boolean;
  title?: string | null;
}

export function BeatmapInline(props: BeatmapInlineProps) {
  let link = `https://osu.ppy.sh/beatmapsets/${props.beatmapset.id}`;

  if (props.gameMode != null) {
    link += `#${gameModeShortName(props.gameMode)}`;
  }

  return (
    <span>
      <a href={link}>
        {props.artist ?? props.beatmapset.artist} - {props.title ?? props.beatmapset.title}
      </a>
      {props.showCreator && (
        <>
          {' ('}
          <a href={`https://osu.ppy.sh/users/${props.beatmapset.creator_id}`}>
            {props.beatmapset.creator_name}
          </a>
          )
        </>
      )}
    </span>
  );
}

export function beatmapText(beatmapset: IBeatmapset, showCreator?: boolean): string {
  let text = `${beatmapset.artist} - ${beatmapset.title}`;

  if (showCreator) {
    text += ` (${beatmapset.creator_name})`;
  }

  return text;
}
