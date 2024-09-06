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
  [LogType.mapperConsentCreated]: {
    self_false: '{actor} created mapper consent for {user}',
    self_true: '{user} created mapper consent',
  },
  [LogType.mapperConsentUpdated]: {
    self_false: '{actor} updated mapper consent for {user}',
    self_true: '{user} updated mapper consent',
  },
  [LogType.mapperConsentBeatmapsetCreated]: {
    self_false: '{actor} created mapper consent for {user} on {beatmapset}',
    self_true: '{user} created mapper consent on {beatmapset}',
  },
  [LogType.mapperConsentBeatmapsetDeleted]: {
    self_false: '{actor} deleted mapper consent for {user} on {beatmapset}',
    self_true: '{user} deleted mapper consent on {beatmapset}',
  },
  [LogType.mapperConsentBeatmapsetUpdated]: {
    self_false: '{actor} updated mapper consent for {user} on {beatmapset}',
    self_true: '{user} updated mapper consent on {beatmapset}',
  },
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
    user_false: '{actor} deleted {gameMode} submission on {beatmapset} (no user attached)',
    user_true_self_false: '{actor} deleted {gameMode} submission for {user} on {beatmapset}',
    user_true_self_true: '{user} deleted {gameMode} submission on {beatmapset}',
  },
  [LogType.reviewCreated]: '{user} created {gameMode} review with {score} on {beatmapset}',
  [LogType.reviewDeleted]: {
    self_false: '{actor} deleted {gameMode} review with {score} for {user} on {beatmapset}',
    self_true: '{user} deleted {gameMode} review with {score} on {beatmapset}',
  },
  [LogType.reviewUpdated]: '{user} updated {gameMode} review with {from} to {to} on {beatmapset}',
  [LogType.beatmapsetCreated]: 'Created beatmapset {beatmapset}',
  [LogType.beatmapsetDeleted]: '{actor} deleted beatmapset {beatmapset}',
  [LogType.beatmapsetSoftDeleted]: 'Soft-deleted beatmapset {beatmapset}',
  [LogType.beatmapsetUpdated]: 'Updated beatmapset {beatmapset}',
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

  switch (log.type) {
    case LogType.mapperConsentCreated:
    case LogType.mapperConsentUpdated:
    case LogType.mapperConsentBeatmapsetCreated:
    case LogType.mapperConsentBeatmapsetDeleted:
    case LogType.mapperConsentBeatmapsetUpdated:
    case LogType.reviewDeleted:
      if (log.values != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actorIsUser = (log.values.actor as any).id === (log.values.user as any).id;

        template = logTemplates[log.type][`self_${actorIsUser}`];
      }
      break;
    case LogType.extraTokenDeleted:
      if (log.values != null) {
        const hasActor = log.values.actor != null;
        const hasScopes = Array.isArray(log.values.scopes) && log.values.scopes.length > 0;

        template = logTemplates[log.type][`actor_${hasActor}_scopes_${hasScopes}`];
      }
      break;
    case LogType.submissionDeleted:
      if (log.values != null) {
        if (log.values.user == null) {
          template = logTemplates[log.type].user_false;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const actorIsUser = (log.values.actor as any).id === (log.values.user as any).id;

          template = logTemplates[log.type][`user_true_self_${actorIsUser}`];
        }
      }
      break;
    default:
      template = logTemplates[log.type] ?? '{invalid}';
      break;
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
