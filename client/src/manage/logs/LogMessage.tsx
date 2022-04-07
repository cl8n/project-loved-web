import type { ReactNode } from 'react';
import { BeatmapInline } from '../../BeatmapInline';
import type { ILog } from '../../interfaces';
import { LogType } from '../../interfaces';
import { Never } from '../../Never';
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
};

function logElementForTemplate(
  type: LogType,
  parameter: string,
  values: Record<string, any>,
): ReactNode {
  switch (parameter) {
    case 'actor':
      return <UserInline user={values.actor} />;
    case 'beatmapset':
      return <BeatmapInline beatmapset={values.beatmapset} />;
    case 'invalid':
      return <i>Unsupported log type</i>;
    case 'role':
      return renderRole(values.role);
    case 'user':
      return <UserInline user={values.user} />;
  }

  switch (`${type}-${parameter}`) {
    case `${LogType.userUpdated}-from`:
      return <UserInline user={values.from} />;
    case `${LogType.userUpdated}-to`:
      return <UserInline user={values.to} />;
    case `${LogType.roleToggledAlumni}-markedOrUnmarked`:
      return values.role.alumni ? 'marked' : 'unmarked';
    case `${LogType.settingUpdated}-setting`:
      return <code>{values.setting}</code>;
  }

  return <Never />;
}

export default function LogMessage(log: ILog) {
  const template = logTemplates[log.type] ?? '{invalid}';
  const templateRegex = /{([a-z]+)}/gi;
  const elements: ReactNode[] = [];
  let match: RegExpExecArray | null;
  let lastMatchEnd = 0;

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
