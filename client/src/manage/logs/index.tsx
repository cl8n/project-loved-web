import { LogType } from 'loved-bridge/tables';
import { useState } from 'react';
import useTitle from '../../useTitle';
import LogList from './LogList';

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
            <label htmlFor={logType.toString()}>
              <code>{LogType[logType]}</code>
            </label>
          </div>
        ))}
      </div>
      <LogList typesVisible={typesVisible} />
    </>
  );
}
