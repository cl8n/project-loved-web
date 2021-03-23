import { GameMode, IBeatmap, IBeatmapset } from './interfaces';
import { gameModeShortName } from './osu-helpers';

type CommonProps = {
  artist?: string;
  showCreator?: boolean;
  title?: string;
};

interface BeatmapProps extends CommonProps {
  beatmap: IBeatmap;
  beatmapset: IBeatmapset;
}

interface BeatmapsetProps extends CommonProps {
  beatmapset: IBeatmapset;
  gameMode?: GameMode;
}

type BeatmapInlineProps = BeatmapProps | BeatmapsetProps;

export function BeatmapInline(props: BeatmapInlineProps) {
  let link = `https://osu.ppy.sh/beatmapsets/${props.beatmapset.id}`;
  let text = `${props.artist ?? props.beatmapset.artist} - ${props.title ?? props.beatmapset.title}`;

  if (props.showCreator)
    text += ` (${props.beatmapset.creator_name})`;

  if ('beatmap' in props) {
    link += `#${gameModeShortName(props.beatmap.game_mode)}/${props.beatmap.id}`;
    text += ` [${props.beatmap.version}]`;
  } else if (props.gameMode != null)
    link += `#${gameModeShortName(props.gameMode)}`;

  return <a href={link}>{text}</a>;
}
