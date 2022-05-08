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
};

const logTypes = Object.values(LogType).filter(
  (logType) => typeof logType === 'number',
) as LogType[];
const initialTypesVisible = logTypes.reduce(
  (all, logType) => ({ ...all, [logType]: false }),
  {} as Partial<Record<LogType, boolean>>,
) as Record<LogType, boolean>;

export default function Logs() {
  useTitle('Logs');
  const [typesVisible, setTypesVisible] = useState(initialTypesVisible);

  const setTypeVisible = (logType: LogType) => () =>
    setTypesVisible((prev) => ({ ...prev, [logType]: !prev[logType] }));

  return (
    <>
      <h1>Logs</h1>
      <div className='box log-type-list'>
        {logTypes.map((logType) => (
          <div key={logType}>
            <input
              name={logType.toString()}
              type='checkbox'
              checked={typesVisible[logType]}
              onChange={setTypeVisible(logType)}
            />
            <label htmlFor={logType.toString()}>{logTypeNames[logType]}</label>
          </div>
        ))}
      </div>
      <LogList typesVisible={typesVisible} />
    </>
  );
}
