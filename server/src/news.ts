import { GameMode, gameModeLongName, gameModeShortName } from 'loved-bridge/beatmaps/gameMode';
import type { Beatmapset, Nomination, Poll, Round, User } from 'loved-bridge/tables';

type NewsPostNomination = Nomination & { beatmapset: Beatmapset };
type ResultsNomination = NewsPostNomination & {
  beatmapset_creators: User[];
  description_author_id: number;
  poll: Poll & {
    passed: boolean;
    result_no: number;
    result_yes: number;
    yesRatio: number;
  };
};

function formatPercent(number: number): string {
  return (number * 100).toFixed(2) + '%';
}

function gameModeLongNameModified(gameMode: GameMode): string {
  return gameMode === GameMode.osu ? 'osu!' : gameModeLongName(gameMode);
}

function joinList(array: string[]): string {
  return array.length < 3
    ? array.join(' and ')
    : array.slice(0, -1).join(', ') + ', and ' + array.at(-1);
}

function mainClosingReplyNomination(nomination: ResultsNomination): string {
  const artistAndTitle =
    (nomination.overwrite_artist || nomination.beatmapset.artist) +
    ' - ' +
    (nomination.overwrite_title || nomination.beatmapset.title);
  const color = nomination.poll.passed ? '#22DD22' : '#DD2222';
  const creators = joinList(
    nomination.beatmapset_creators.map((creator) =>
      creator.id >= 4294000000
        ? creator.name
        : `[url=https://osu.ppy.sh/users/${creator.id}]${creator.name}[/url]`,
    ),
  );

  return (
    `[b][color=${color}]${formatPercent(nomination.poll.yesRatio)}[/color][/b]` +
    ` (${nomination.poll.result_yes}:${nomination.poll.result_no})` +
    ` - [b][url=https://osu.ppy.sh/beatmapsets/${nomination.beatmapset.id}#` +
    `${gameModeShortName(nomination.game_mode)}]${artistAndTitle}[/url][/b]` +
    ` by ${creators}`
  );
}

export function mainClosingReply(nominations: ResultsNomination[], threshold: number): string {
  const failed = nominations.filter((nomination) => !nomination.poll.passed);
  const passed = nominations.filter((nomination) => nomination.poll.passed);
  const thresholdFormatted = formatPercent(threshold);

  let reply = 'Here are the results!\n\n';

  if (passed.length > 0) {
    reply +=
      `The following maps reached the ${thresholdFormatted} threshold needed to be moved to Loved this round:\n` +
      passed.map(mainClosingReplyNomination).join('\n') +
      '\n\n';
  }

  if (failed.length > 0) {
    reply +=
      `The following maps [b]did not[/b] reach the ${thresholdFormatted} threshold, so they will not be moved to Loved:\n` +
      failed.map(mainClosingReplyNomination).join('\n') +
      '\n\n';
  }

  return reply + '\n[b]<3[/b]';
}

export function mainPostTitle(gameMode: GameMode, round: Pick<Round, 'name'>): string {
  return `[${gameModeLongNameModified(gameMode)}] Project Loved: ${round.name}`;
}

export function nominationClosingReply(nomination: ResultsNomination): string {
  return nomination.poll.passed
    ? 'This map passed the voting! It will be moved to Loved soon.'
    : 'This map did not pass the voting.';
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
