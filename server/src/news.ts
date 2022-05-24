import { GameMode, gameModeLongName } from 'loved-bridge/beatmaps/gameMode';
import type { Beatmapset, Nomination, Round } from 'loved-bridge/tables';

type NewsPostNomination = Nomination & { beatmapset: Beatmapset };

function gameModeLongNameModified(gameMode: GameMode): string {
  return gameMode === GameMode.osu ? 'osu!' : gameModeLongName(gameMode);
}

export function mainPostTitle(gameMode: GameMode, round: Pick<Round, 'name'>): string {
  return `[${gameModeLongNameModified(gameMode)}] Project Loved: ${round.name}`;
}

export function nominationPollTitle(nomination: NewsPostNomination): string {
  const artist = nomination.overwrite_artist ?? nomination.beatmapset.artist;
  const title = nomination.overwrite_title ?? nomination.beatmapset.title;

  return `Should ${artist} - ${title} be Loved?`;
}

export function nominationTopicTitle(nomination: NewsPostNomination): string {
  let artist = nomination.overwrite_artist ?? nomination.beatmapset.artist;
  let title = nomination.overwrite_title ?? nomination.beatmapset.title;

  const getTopicTitle = () =>
    `[${gameModeLongNameModified(nomination.game_mode)}] ` +
    `${artist} - ${title} by ${nomination.beatmapset.creator_name}`;

  for (let i = 1; ; i++) {
    const topicTitle = getTopicTitle();

    if (i > 2) {
      return topicTitle.slice(0, 97) + '...';
    }
    if (topicTitle.length <= 100) {
      return topicTitle;
    }

    const artistLonger = artist.length > title.length;
    const lengthToSave = Math.min(topicTitle.length - 100, 25);

    if (artistLonger) {
      artist = artist.slice(0, -lengthToSave - 3) + '...';
    } else {
      title = title.slice(0, -lengthToSave - 3) + '...';
    }
  }
}
