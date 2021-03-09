import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLogs, getUsersWithRoles, isApiObjectType, updateApiObject, updateUserRoles, useApi } from './api';
import { BoolView } from './BoolView';
import { setFormDisabled } from './dom-helpers';
import { ILog, IUser, LogType } from './interfaces';
import { Modal } from './Modal';
import { Never } from './Never';
import { useOsuAuth } from './osuAuth';
import { canWriteAs } from './permissions';
import { UserInline } from './UserInline';

type ApiObjectUpdateLog = {
  id: number;
  type: string;
  success: boolean;
};

function ApiObjectMenu() {
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<ApiObjectUpdateLog[]>([]);

  const [id, setId] = useState<number>();
  const [type, setType] = useState<string>();

  const addLog = (log: ApiObjectUpdateLog) => setLogs((prev) => prev.concat(log));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (id == null || !isApiObjectType(type))
      return;

    setBusy(true);

    updateApiObject(type, id)
      .then(() => addLog({ id, type, success: true }))
      .catch(() => addLog({ id, type, success: false }))
      .finally(() => setBusy(false));
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor='type'>Type</label>
      <select
        name='type'
        value={type}
        onChange={(e) => setType(e.target.value)}
        disabled={busy}
      >
        <option value='beatmapset'>Beatmapset</option>
        <option value='user'>User</option>
      </select>
      <label htmlFor='id'>ID</label>
      <input
        type='number'
        name='id'
        value={id}
        onChange={(e) => setId(parseInt(e.target.value))}
        disabled={busy}
      />
      <button
        type='submit'
        disabled={busy}
      >
        {busy ? 'Updating...' : 'Update'}
      </button>
      <ApiObjectMenuUpdateLogs logs={logs} />
    </form>
  );
}

function ApiObjectMenuUpdateLogs(props: { logs: ApiObjectUpdateLog[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {props.logs.map((log, logIndex) => (
        <span
          key={logIndex}
          className={log.success ? 'success' : 'error'}
        >
          {log.success
            ? `Updated ${log.type} #${log.id}`
            : `Failed to update ${log.type} #${log.id}`
          }
        </span>
      ))}
    </div>
  );
}

const boolRoles = ['metadata', 'moderator', 'news', 'god', 'god_readonly'] as const;
const boolRolesNames = {
  captain: 'Captain',
  metadata: 'Metadata',
  moderator: 'Moderator',
  news: 'News',
  god: 'God',
  god_readonly: 'Readonly',
};

function PermissionsMenu() {
  const authUser = useOsuAuth().user;
  const [users, usersError, setUsers] = useApi<IUser[]>(getUsersWithRoles);

  const roleSetter = (userId: number) => {
    return (roles: Partial<IUser['roles']>) => {
      setUsers((prev) => {
        const user = (prev ?? []).find((user) => user.id === userId)!;
        Object.assign(user.roles, roles);
        return prev;
      });
    };
  };

  if (authUser == null)
    return <Never />;

  if (usersError != null)
    return <span className='panic'>Failed to load users: {usersError.message}</span>;

  if (users == null)
    return <span>Loading users...</span>;

  return (
    <table>
      <tr>
        <th>User</th>
        <th>Captain</th>
        {boolRoles.map((role) => (
          <th key={role}>{boolRolesNames[role]}</th>
        ))}
      </tr>
      {users.map((user) => (
        <tr key={user.id}>
          <td>
            <UserInline user={user} />
          </td>
          <td>
            <BoolView value={user.roles.captain} />
            {user.roles.captain &&
              `(${user.roles.captain_game_mode})`
            }
          </td>
          {boolRoles.map((role) => (
            <td key={role}>
              <BoolView value={user.roles[role]} />
            </td>
          ))}
          {canWriteAs(authUser, 'god') &&
            <PermissionsMenuUserEditor
              user={user}
              setRoles={roleSetter(user.id)}
            />
          }
        </tr>
      ))}
    </table>
  );
}

type PermissionsMenuUserEditorProps = {
  setRoles: (roles: Partial<IUser['roles']>) => void;
  user: IUser;
};

function PermissionsMenuUserEditor(props: PermissionsMenuUserEditorProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formFields, setFormFields] = useState(props.user.roles);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (formRef.current != null)
      setFormDisabled(formRef.current, busy);
  }, [busy]);

  useEffect(() => {
    if (!formFields.captain)
      formFieldSetter('captain_game_mode')(undefined);
  }, [formFields]);

  const formFieldSetter = <T extends keyof IUser['roles']>(field: T) => {
    return (value: IUser['roles'][T]) => {
      setFormFields((prev) => {
        prev[field] = value;
        return prev;
      });
    };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setBusy(true);

    updateUserRoles(props.user.id, formFields)
      .then(() => props.setRoles(formFields))
      .finally(() => setBusy(false));
  };

  const handleGameModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.preventDefault();

    if (!formFields.captain)
      return;

    let value: string | number | undefined = event.target.value;

    if (value === 'none')
      value = undefined;
    else
      value = parseInt(value);

    formFieldSetter('captain_game_mode')(value);
  };

  return (
    <>
      <td>
        <button
          className='fake-a'
          onClick={() => setModalOpen(true)}
          type='button'
        >
          Edit
        </button>
      </td>
      <Modal
        close={() => setModalOpen(false)}
        open={modalOpen}
      >
        <h2>Editing <UserInline user={props.user} noFlag /></h2>
        <form ref={formRef} onSubmit={handleSubmit}>
          <table className='center-block'>
            <tr>
              <th>Role</th>
              <th>Unset</th>
              <th>Set</th>
            </tr>
            <tr>
              <td>Captain</td>
              <BoolRadioCell
                name='captain'
                enabled={formFields.captain}
                setEnabled={formFieldSetter('captain')}
              />
            </tr>
            <tr>
              <td>Game mode</td>
              <td colSpan={2}>
                <select
                  name='captain_game_mode'
                  value={formFields.captain_game_mode ?? 'none'}
                  onChange={handleGameModeChange}
                >
                  <option value='none'>None</option>
                  <option value='0'>Standard</option>
                  <option value='1'>Taiko</option>
                  <option value='2'>Catch</option>
                  <option value='3'>Mania</option>
                </select>
              </td>
            </tr>
            {boolRoles.map((role) => (
              <tr key={role}>
                <td>{boolRolesNames[role]}</td>
                <BoolRadioCell
                  name={role}
                  enabled={formFields[role]}
                  setEnabled={formFieldSetter(role)}
                />
              </tr>
            ))}
          </table>
          <button type='submit' className='modal-submit-button'>
            {busy ? 'Updating...' : 'Update'}
          </button>
        </form>
      </Modal>
    </>
  );
}

type BoolRadioCellProps = {
  enabled: boolean;
  name: string;
  setEnabled: (enabled: boolean) => void;
};

function BoolRadioCell(props: BoolRadioCellProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    props.setEnabled(event.target.value === '1');
  };

  return (
    <>
      <td>
        <input
          type='radio'
          name={props.name}
          value='0'
          onChange={handleChange}
          checked={!props.enabled}
        />
      </td>
      <td>
        <input
          type='radio'
          name={props.name}
          value='1'
          onChange={handleChange}
          checked={props.enabled}
        />
      </td>
    </>
  );
}

function Logs() {
  const [logs, logsError] = useApi<ILog[]>(getLogs);

  const getLogClassName = (log: ILog) => {
    switch (log.type) {
      case LogType.error:
        return 'error';
    }
  };

  if (logsError != null)
    return <span className='panic'>Failed to load logs: {logsError.message}</span>;

  if (logs == null)
    return <span>Loading logs...</span>;

  return (
    <table>
      {logs.map((log) => (
        <tr key={log.id}>
          <td>{log.created_at} (#{log.id})</td>
          <td className={getLogClassName(log)}><LogMessage {...log} /></td>
          <td>{log.creator}</td>
        </tr>
      ))}
    </table>
  );
}

function LogMessage(log: ILog) {
  if (Object.keys(log.links).length === 0)
    return <span>log.message</span>;

  const elements: JSX.Element[] = [];
  const regex = /{([^{}]+)}{([^{}]+)}/g;
  let match: RegExpExecArray | null;
  let lastMatchEnd = 0;

  while ((match = regex.exec(log.message)) != null) {
    if (lastMatchEnd !== match.index)
      elements.push(
        <span>{log.message.slice(lastMatchEnd, match.index)}</span>
      );

    elements.push(
      match[2].startsWith('/')
        ? <Link to={match[2]}>{match[1]}</Link>
        : <a href={match[2]}>{match[1]}</a>
    );

    lastMatchEnd = regex.lastIndex;
  }

  if (lastMatchEnd !== log.message.length)
    elements.push(
      <span>{log.message.slice(lastMatchEnd)}</span>
    );

  return <>elements</>;
}

export function Manage() {
  return (
    <>
      <div className='content-block'>
        <h1>User permissions</h1>
        <PermissionsMenu />
      </div>
      <div className='content-block'>
        <h1>API objects</h1>
        <ApiObjectMenu />
      </div>
      <div className='content-block'>
        <h1>Logs</h1>
        <Logs />
      </div>
    </>
  );
}
