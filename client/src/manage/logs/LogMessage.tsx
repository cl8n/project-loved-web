import { gameModeLongName } from 'loved-bridge/beatmaps/gameMode';
import type { Log } from 'loved-bridge/tables';
import { LogType } from 'loved-bridge/tables';
import type { ReactNode } from 'react';
import { BeatmapInline } from '../../BeatmapInline';
import ListInline from '../../ListInline';
import { Never } from '../../Never';
import ReviewScore from '../../submission-listing/ReviewScore';
import { UserInline } from '../../UserInline';
import { renderRole } from '../roles/RolesList';

const logTemplates = {
  [LogType.apiServerStarted]: 'Started API server',
  [LogType.loggedIn]: '{user} logged in',
  [LogType.loggedOut]: '{user} logged out',
  [LogType.userCreated]: 'Created user {user}',
  [LogType.userUpdated]: 'Updated user {from} to {to}',
  [LogType.roleCreated]: '{actor} created role {role} on {user}',
  [LogType.roleDeleted]: '{actor} deleted role {role} from {user}',
  [LogType.roleToggledAlumni]: '{actor} {markedOrUnmarked} role {role} as alumni on {user}',
  [LogType.mapperConsentCreated]: '{actor} created mapper consent for {user}',
  [LogType.mapperConsentUpdated]: '{actor} updated mapper consent for {user}',
  [LogType.mapperConsentBeatmapsetCreated]:
    '{actor} created mapper consent for {user} on {beatmapset}',
  [LogType.mapperConsentBeatmapsetDeleted]:
    '{actor} deleted mapper consent for {user} on {beatmapset}',
  [LogType.mapperConsentBeatmapsetUpdated]:
    '{actor} updated mapper consent for {user} on {beatmapset}',
  [LogType.settingUpdated]: '{actor} updated setting {setting}',
  [LogType.extraTokenCreated]: '{user} created extra token with scopes {scopes}',
  [LogType.extraTokenDeleted]: {
    actor_false_scopes_false: 'Deleted extra token for {user}',
    actor_false_scopes_true: 'Deleted extra token for {user} with scopes {scopes}',
    actor_true_scopes_false: '{actor} deleted extra token for {user}',
    actor_true_scopes_true: '{actor} deleted extra token for {user} with scopes {scopes}',
  },
  [LogType.pollCreated]:
    '{actor} created {gameMode} poll {poll} on {beatmapset} for the round of {round}',
  [LogType.pollUpdated]:
    '{actor} updated results for {gameMode} poll {poll} on {beatmapset} for the round of {round}',
  [LogType.submissionDeleted]: {
    user_false: '{actor} deleted {gameMode} submission on {beatmapset}',
    user_true: '{actor} deleted {gameMode} submission for {user} on {beatmapset}',
  },
  [LogType.reviewCreated]: '{user} created {gameMode} review with {score} on {beatmapset}',
  [LogType.reviewDeleted]:
    '{actor} deleted {gameMode} review with {score} for {user} on {beatmapset}',
  [LogType.reviewUpdated]: '{user} updated {gameMode} review with {from} to {to} on {beatmapset}',
  [LogType.beatmapsetCreated]: '{actor} created beatmapset {beatmapset}',
  [LogType.beatmapsetDeleted]: '{actor} deleted beatmapset {beatmapset}',
} as const;

function logElementForTemplate(
  type: LogType,
  parameter: string,
  // TODO should be Record<string, unknown> and type check the values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: Record<string, any>,
): ReactNode {
  switch (`${type}-${parameter}`) {
    case `${LogType.userUpdated}-from`:
    case `${LogType.userUpdated}-to`:
      return <UserInline user={values[parameter]} />;
    case `${LogType.roleToggledAlumni}-markedOrUnmarked`:
      return values.role.alumni ? 'marked' : 'unmarked';
    case `${LogType.settingUpdated}-setting`:
      return <code>{values.setting}</code>;
    case `${LogType.submissionDeleted}-gameMode`:
      return gameModeLongName(values.submission.game_mode);
    case `${LogType.reviewCreated}-gameMode`:
    case `${LogType.reviewDeleted}-gameMode`:
      return gameModeLongName(values.review.game_mode);
    case `${LogType.reviewUpdated}-from`:
    case `${LogType.reviewUpdated}-to`:
      return <ReviewScore review={values[parameter]} />;
    case `${LogType.reviewUpdated}-gameMode`:
      return gameModeLongName(values.from.game_mode);
  }

  switch (parameter) {
    case 'actor':
    case 'user':
      return <UserInline user={values[parameter]} />;
    case 'beatmapset':
      return <BeatmapInline beatmapset={values.beatmapset} gameMode={values.gameMode} />;
    case 'gameMode':
      return gameModeLongName(values.gameMode);
    case 'invalid':
      return <i>Unsupported log type</i>;
    case 'poll':
      return (
        <a href={`https://osu.ppy.sh/community/forums/topics/${values.poll.topic_id}`}>
          #{values.poll.id}
        </a>
      );
    case 'role':
      return renderRole(values.role);
    case 'round':
      return `${values.round.name} [#${values.round.id}]`;
    case 'scopes':
      return <ListInline<string> array={values.scopes} render={(scope) => <code>{scope}</code>} />;
    case 'score':
      return <ReviewScore review={values.review} />;
  }

  return <Never />;
}

export default function LogMessage(log: Log) {
  let template = '{invalid}';
  const templateRegex = /{([a-z]+)}/gi;
  const elements: ReactNode[] = [];
  let match: RegExpExecArray | null;
  let lastMatchEnd = 0;

  if (log.type === LogType.extraTokenDeleted) {
    if (log.values != null) {
      const hasActor = log.values.actor != null;
      const hasScopes = Array.isArray(log.values.scopes) && log.values.scopes.length > 0;

      template = logTemplates[log.type][`actor_${hasActor}_scopes_${hasScopes}`];
    }
  } else if (log.type === LogType.submissionDeleted) {
    if (log.values != null) {
      const hasUser = log.values.user != null;

      template = logTemplates[log.type][`user_${hasUser}`];
    }
  } else {
    template = logTemplates[log.type] ?? '{invalid}';
  }

  if (log.values != null) {
    while ((match = templateRegex.exec(template)) != null) {
      if (lastMatchEnd !== match.index) {
        elements.push(<span>{template.slice(lastMatchEnd, match.index)}</span>);
      }

      elements.push(logElementForTemplate(log.type, match[1], log.values));
      lastMatchEnd = templateRegex.lastIndex;
    }
  }

  if (lastMatchEnd !== template.length) {
    elements.push(<span>{template.slice(lastMatchEnd)}</span>);
  }

  return <>{elements}</>;
}
