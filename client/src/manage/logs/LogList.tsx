import type { Log, LogType } from 'loved-bridge/tables';
import type { Dispatch } from 'react';
import { useEffect, useState } from 'react';
import { FormattedDate } from 'react-intl';
import type { ResponseError } from 'superagent';
import { apiErrorMessage, getLogs } from '../../api';
import PageSelector from '../../PageSelector';
import LogMessage from './LogMessage';

interface LogListProps {
  logTypes: LogType[];
  page: number;
  setPage: Dispatch<number>;
}

export default function LogList({ logTypes, page, setPage }: LogListProps) {
  const [busy, setBusy] = useState(false);
  const [logsError, setLogsError] = useState<ResponseError>();
  const [logsInfo, setLogsInfo] = useState<{ logs: Log[]; pageSize: number; total: number }>();

  useEffect(() => {
    setBusy(true);

    getLogs(logTypes, page)
      .then(({ body }) => setLogsInfo(body))
      .catch(setLogsError)
      .finally(() => setBusy(false));
  }, [logTypes, page]);

  if (logsError != null) {
    return <span className='panic'>Failed to load logs: {apiErrorMessage(logsError)}</span>;
  }

  if (logsInfo == null) {
    return <span>Loading logs...</span>;
  }

  if (logsInfo.logs.length === 0) {
    return <b>No logs to show!</b>;
  }

  const pageCount = Math.ceil(logsInfo.total / logsInfo.pageSize);

  return (
    <>
      <PageSelector disabled={busy} page={page} pageCount={pageCount} setPage={setPage} />
      <table className='main-table'>
        <thead>
          <tr className='sticky'>
            <th>ID</th>
            <th>Timestamp</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {logsInfo.logs.map((log) => (
            <tr key={log.id}>
              <td>#{log.id}</td>
              <td>
                <FormattedDate dateStyle='medium' timeStyle='medium' value={log.created_at} />
              </td>
              <td className='normal-wrap fix-column-layout'>
                <LogMessage {...log} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PageSelector disabled={busy} page={page} pageCount={pageCount} setPage={setPage} />
    </>
  );
}
