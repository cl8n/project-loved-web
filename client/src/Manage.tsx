import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  alertApiErrorMessage,
  apiErrorMessage,
  deleteBeatmapset,
  getLogs,
  isApiObjectType,
  updateApiObject,
  updateApiObjectBulk,
  useApi,
} from './api';
import { autoHeightRef } from './auto-height';
import type { FormSubmitHandler } from './dom-helpers';
import { Form } from './dom-helpers';
import type { ILog } from './interfaces';
import { LogType } from './interfaces';
import UsersAndRolesList from './manage/UsersAndRolesList';
import { Never } from './Never';
import { UserInline } from './UserInline';
import useTitle from './useTitle';

interface ApiObjectUpdateLog {
  id: number;
  type: string;
  success: boolean;
}

function ApiObjectMenu() {
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<ApiObjectUpdateLog[]>([]);

  const addLog = (log: ApiObjectUpdateLog) => setLogs((prev) => prev.concat(log));

  const onSubmit: FormSubmitHandler = (form, then) => {
    const id = form.id;
    const type = form.type;

    if (isNaN(id) || !isApiObjectType(type)) {
      return null;
    }

    return updateApiObject(type, id)
      .then(() => addLog({ id, type, success: true }))
      .then(then)
      .catch(() => addLog({ id, type, success: false }));
  };

  return (
    <Form busyState={[busy, setBusy]} keepAfterSubmit onSubmit={onSubmit}>
      <table>
        <tr>
          <td>
            <label htmlFor='type'>Type</label>
          </td>
          <td>
            <select name='type' required>
              <option value='beatmapset'>Beatmapset</option>
              <option value='user'>User</option>
            </select>
          </td>
        </tr>
        <tr>
          <td>
            <label htmlFor='id'>ID</label>
          </td>
          <td>
            <input type='number' name='id' required data-value-type='int' />
          </td>
        </tr>
        <tr>
          <td>
            <button type='submit'>{busy ? 'Updating...' : 'Update'}</button>
          </td>
        </tr>
      </table>
      <ApiObjectMenuUpdateLogs logs={logs} />
    </Form>
  );
}

function ApiObjectMenuUpdateLogs(props: { logs: ApiObjectUpdateLog[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {props.logs.map((log, logIndex) => (
        <span key={logIndex} className={log.success ? 'success' : 'error'}>
          {log.success
            ? `Updated ${log.type} #${log.id}`
            : `Failed to update ${log.type} #${log.id}`}
        </span>
      ))}
    </div>
  );
}

function ApiObjectBulkMenu() {
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    const ids = (form.ids as string).trim();
    const type = form.type;

    if (!isApiObjectType(type) || ids.match(/[\d\n]+/) == null) {
      return null;
    }

    const numericIds = ids.split('\n').map((id) => parseInt(id));

    return updateApiObjectBulk(type, numericIds).then(then).catch(alertApiErrorMessage);
  };

  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <table>
        <tr>
          <td>
            <label htmlFor='type'>Type</label>
          </td>
          <td>
            <select name='type' required>
              <option value='beatmapset'>Beatmapset</option>
              <option value='user'>User</option>
            </select>
          </td>
        </tr>
        <tr>
          <td>
            <label htmlFor='ids'>IDs</label>
          </td>
          <td>
            <textarea name='ids' required ref={autoHeightRef} />
          </td>
        </tr>
        <tr>
          <td>
            <button type='submit'>{busy ? 'Updating...' : 'Update'}</button>
          </td>
        </tr>
      </table>
    </Form>
  );
}

function BeatmapsetDeleteMenu() {
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return deleteBeatmapset(form.id).then(then).catch(alertApiErrorMessage);
  };

  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <table>
        <tr>
          <td>
            <label htmlFor='id'>ID</label>
          </td>
          <td>
            <input type='number' name='id' required data-value-type='int' />
          </td>
        </tr>
        <tr>
          <td>
            <button type='submit'>{busy ? 'Deleting...' : 'Delete'}</button>
          </td>
        </tr>
      </table>
    </Form>
  );
}

function Logs() {
  const [logs, logsError] = useApi(getLogs);

  if (logsError != null) {
    return <span className='panic'>Failed to load logs: {apiErrorMessage(logsError)}</span>;
  }

  if (logs == null) {
    return <span>Loading logs...</span>;
  }

  return (
    <table>
      {logs.map((log) => (
        <tr key={log.id}>
          <td>[#{log.id}]</td>
          <td>{log.created_at}</td>
          <td>
            <LogMessage {...log} />
          </td>
        </tr>
      ))}
    </table>
  );
}

const logTemplates = {
  [LogType.apiServerStarted]: 'Started API server',
  [LogType.loggedIn]: '{user} logged in',
  [LogType.loggedOut]: '{user} logged out',
};

function logElementForTemplate(parameter: string, values: Record<string, any>): JSX.Element {
  switch (parameter) {
    case 'user':
      return <UserInline user={values.user} />;
  }

  return <Never />;
}

function LogMessage(log: ILog) {
  const template = logTemplates[log.type];
  const templateRegex = /{([a-z]+)}/gi;
  const elements: JSX.Element[] = [];
  let match: RegExpExecArray | null;
  let lastMatchEnd = 0;

  if (log.values != null) {
    while ((match = templateRegex.exec(template)) != null) {
      if (lastMatchEnd !== match.index) {
        elements.push(<span>{template.slice(lastMatchEnd, match.index)}</span>);
      }

      elements.push(logElementForTemplate(match[1], log.values));
      lastMatchEnd = templateRegex.lastIndex;
    }
  }

  if (lastMatchEnd !== template.length) {
    elements.push(<span>{template.slice(lastMatchEnd)}</span>);
  }

  return <>{elements}</>;
}

export function Manage() {
  useTitle('Management');

  return (
    <>
      <div className='content-block'>
        <h1>Roles</h1>
        <UsersAndRolesList />
      </div>
      <div className='content-block'>
        <h1>API objects</h1>
        <h2>Single</h2>
        <ApiObjectMenu />
        <h2>Bulk</h2>
        <ApiObjectBulkMenu />
        <h2>Delete beatmapset</h2>
        <BeatmapsetDeleteMenu />
      </div>
      <div className='content-block'>
        <h1>Logs</h1>
        <Logs />
      </div>
    </>
  );
}
