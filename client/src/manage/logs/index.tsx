import { LogType } from 'loved-bridge/tables';
import { useState } from 'react';
import useTitle from '../../useTitle';
import LogList from './LogList';

const logTypeNames = {
  [LogType.apiServerStarted]: 'Server start',
  [LogType.loggedIn]: 'Log in',
  [LogType.loggedOut]: 'Log out',
  [LogType.userCreated]: 'User create',
  [LogType.userUpdated]: 'User update',
  [LogType.roleCreated]: 'Role create',
  [LogType.roleDeleted]: 'Role delete',
  [LogType.roleToggledAlumni]: 'Role alumni toggle',
  [LogType.mapperConsentCreated]: 'Mapper consent create',
  [LogType.mapperConsentUpdated]: 'Mapper consent update',
  [LogType.mapperConsentBeatmapsetCreated]: 'Mapper consent beatmapset create',
  [LogType.mapperConsentBeatmapsetDeleted]: 'Mapper consent beatmapset delete',
  [LogType.mapperConsentBeatmapsetUpdated]: 'Mapper consent beatmapset update',
  [LogType.settingUpdated]: 'Setting update',
  [LogType.extraTokenCreated]: 'Extra token create',
  [LogType.extraTokenDeleted]: 'Extra token delete',
  [LogType.pollCreated]: 'Poll create',
  [LogType.pollUpdated]: 'Poll update',
  [LogType.submissionDeleted]: 'Submission delete',
  [LogType.reviewCreated]: 'Review create',
  [LogType.reviewDeleted]: 'Review delete',
  [LogType.reviewUpdated]: 'Review update',
  [LogType.beatmapsetCreated]: 'Beatmapset create',
  [LogType.beatmapsetDeleted]: 'Beatmapset delete',
};

const allLogTypes = Object.values(LogType).filter(
  (logType) =>
    typeof logType === 'number' && logType !== LogType.loggedIn && logType !== LogType.loggedOut,
) as LogType[];

export default function Logs() {
  useTitle('Logs');
  const [logTypes, setLogTypes] = useState<Partial<Record<LogType, boolean>>>({});
  const [page, setPage] = useState(1);

  return (
    <>
      <h1>Logs</h1>
      <div className='box log-type-list'>
        {allLogTypes.map((logType) => (
          <div key={logType}>
            <input
              name={logType.toString()}
              type='checkbox'
              checked={logTypes[logType] ?? false}
              onChange={() => {
                setLogTypes((prev) => ({ ...prev, [logType]: !prev[logType] }));
                setPage(1);
              }}
            />
            <label htmlFor={logType.toString()}>{logTypeNames[logType]}</label>
          </div>
        ))}
      </div>
      <LogList
        logTypes={allLogTypes.filter((logType) => logTypes[logType])}
        page={page}
        setPage={setPage}
      />
    </>
  );
}
