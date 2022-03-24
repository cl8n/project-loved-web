import { FormattedDate } from 'react-intl';
import { apiErrorMessage, getLogs, useApi } from '../../api';
import type { LogType } from '../../interfaces';
import LogMessage from './LogMessage';

interface LogListProps {
  typesVisible: Record<LogType, boolean>;
}

export default function LogList({ typesVisible }: LogListProps) {
  let [logs, logsError] = useApi(getLogs);

  if (logsError != null) {
    return <span className='panic'>Failed to load logs: {apiErrorMessage(logsError)}</span>;
  }

  if (logs == null) {
    return <span>Loading logs...</span>;
  }

  if (Object.values(typesVisible).some((visible) => visible)) {
    logs = logs.filter((log) => typesVisible[log.type]);
  }

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Timestamp</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td>#{log.id}</td>
            <td>
              <FormattedDate dateStyle='medium' timeStyle='medium' value={log.created_at} />
            </td>
            <td>
              <LogMessage {...log} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
