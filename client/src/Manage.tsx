import { ChangeEvent, ChangeEventHandler, RefObject, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addUser,
  apiErrorMessage,
  getLogs,
  getUsersWithRoles,
  isApiObjectType,
  updateApiObject,
  updateApiObjectBulk,
  updateUserRoles,
  useApi
} from './api';
import { BoolView } from './BoolView';
import { Form, FormSubmitHandler } from './dom-helpers';
import { ILog, IUser, LogType } from './interfaces';
import { Modal } from './Modal';
import { Never } from './Never';
import { gameModeLongName } from './osu-helpers';
import { useOsuAuth } from './osuAuth';
import { canReadAs, canWriteAs } from './permissions';
import { UserInline } from './UserInline';
import {autoHeightRef} from "./auto-height";

type ApiObjectUpdateLog = {
  id: number;
  type: string;
  success: boolean;
};

function ApiObjectMenu() {
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<ApiObjectUpdateLog[]>([]);

  const addLog = (log: ApiObjectUpdateLog) => setLogs((prev) => prev.concat(log));

  const onSubmit: FormSubmitHandler = (form, then) => {
    const id = form.id;
    const type = form.type;

    if (isNaN(id) || !isApiObjectType(type))
      return null;

    return updateApiObject(type, id)
      .then(() => addLog({ id, type, success: true }))
      .then(then)
      .catch(() => addLog({ id, type, success: false }));
  };

  return (
    <Form busyState={[busy, setBusy]} keepAfterSubmit onSubmit={onSubmit}>
      <table>
        <tr>
          <td><label htmlFor='type'>Type</label></td>
          <td>
            <select name='type' required>
              <option value='beatmapset'>Beatmapset</option>
              <option value='user'>User</option>
            </select>
          </td>
        </tr>
        <tr>
          <td><label htmlFor='id'>ID</label></td>
          <td><input type='number' name='id' required data-value-type='int' /></td>
        </tr>
        <tr>
          <td>
            <button type='submit'>
              {busy ? 'Updating...' : 'Update'}
            </button>
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

function ApiObjectBulkMenu() {
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    const ids = (form.ids as string).trim();
    const type = form.type;

    if (!isApiObjectType(type) || ids.match(/[\d\n]+/) == null)
      return null;

    const numericIds = ids
      .split('\n')
      .map((id) => parseInt(id));

    return updateApiObjectBulk(type, numericIds)
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error better
  };

  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <table>
        <tr>
          <td><label htmlFor='type'>Type</label></td>
          <td>
            <select name='type' required>
              <option value='beatmapset'>Beatmapset</option>
              <option value='user'>User</option>
            </select>
          </td>
        </tr>
        <tr>
          <td><label htmlFor='ids'>IDs</label></td>
          <td><textarea name='ids' required ref={autoHeightRef} /></td>
        </tr>
        <tr>
          <td>
            <button type='submit'>
              {busy ? 'Updating...' : 'Update'}
            </button>
          </td>
        </tr>
      </table>
    </Form>
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

const sortUsers = (users: IUser[]): IUser[] => {
  return users
    .sort((a, b) => a.name.localeCompare(b.name))
    .sort((a, b) => +canReadAs(b, 'any') - +canReadAs(a, 'any'));
}

function PermissionsMenu() {
  const authUser = useOsuAuth().user;
  const [users, usersError, setUsers] = useApi(getUsersWithRoles, [], sortUsers);

  const roleSetter = (userId: number) => {
    return (roles: IUser['roles']) => {
      setUsers((prev) => {
        const users = [...prev!];
        users.find((user) => user.id === userId)!.roles = roles;
        return sortUsers(users);
      });
    };
  };

  const onUserAdd = (user: IUser) => {
    setUsers((prev) => {
      const users = [...prev!];
      users.push(user);
      return sortUsers(users);
    });
  };

  if (authUser == null)
    return <Never />;

  if (usersError != null)
    return <span className='panic'>Failed to load users: {apiErrorMessage(usersError)}</span>;

  if (users == null)
    return <span>Loading users...</span>;

  return (
    <>
      {canWriteAs(authUser) &&
        <AddUser onUserAdd={onUserAdd} />
      }
      <table>
        <tr>
          <th>User</th>
          <th>Captain</th>
          {boolRoles.map((role) => (
            <th key={role}>{boolRolesNames[role]}</th>
          ))}
        </tr>
        {users.map((user) => (
          <tr key={user.id} className={canReadAs(user, 'any') ? undefined : 'faded'}>
            <td>
              <UserInline user={user} />
            </td>
            <td>
              <BoolView value={user.roles.captain} />
              {user.roles.captain_game_mode != null &&
                ` (${gameModeLongName(user.roles.captain_game_mode)})`
              }
            </td>
            {boolRoles.map((role) => (
              <td key={role}>
                <BoolView value={user.roles[role]} />
              </td>
            ))}
            {canWriteAs(authUser) &&
              <PermissionsMenuUserEditor
                user={user}
                setRoles={roleSetter(user.id)}
              />
            }
          </tr>
        ))}
      </table>
    </>
  );
}

type AddUserProps = {
  onUserAdd: (user: IUser) => void;
};

function AddUser({ onUserAdd }: AddUserProps) {
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return addUser(form.username)
      .then((response) => onUserAdd(response.body))
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error better
  };

  // TODO class should probably go on the form itself
  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <p className='flex-left'>
        <label htmlFor='username'>Username</label>
        <input type='text' name='username' required />
        <button type='submit'>
          {busy ? 'Adding...' : 'Add'}
        </button>
      </p>
    </Form>
  );
}

type PermissionsMenuUserEditorProps = {
  setRoles: (roles: IUser['roles']) => void;
  user: IUser;
};

function PermissionsMenuUserEditor({ setRoles, user }: PermissionsMenuUserEditorProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const captainRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)] as const;
  const captainGameModeRef = useRef<HTMLSelectElement>(null);

  const onSubmit: FormSubmitHandler = (form, then) => {
    const roles = { // TODO lol...
      captain: form.captain === '1',
      captain_game_mode: form.captain_game_mode === 'none' ? undefined : parseInt(form.captain_game_mode),
      god: form.god === '1',
      god_readonly: form.god_readonly === '1',
      metadata: form.metadata === '1',
      moderator: form.moderator === '1',
      news: form.news === '1',
    };

    return updateUserRoles(user.id, roles)
      .then(() => setRoles(roles))
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error))) // TODO: show error better
      .finally(() => setModalOpen(false));
  };

  const onCaptainChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (captainGameModeRef.current != null) {
      if (event.target.checked !== (event.target.value === '1'))
        captainGameModeRef.current.value = 'none';
      else if (captainGameModeRef.current.value === 'none')
        captainGameModeRef.current.value = '0';
    }
  };

  const onCaptainGameModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (captainRefs[0].current != null && captainRefs[1].current != null) {
      const changedToNone = event.target.value === 'none';

      captainRefs[0].current.checked = changedToNone;
      captainRefs[1].current.checked = !changedToNone;
    }
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
        <h2>Editing <UserInline user={user} noFlag /></h2>
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <table className='center-block'>
            <tr>
              <th>Role</th>
              <th>Unset</th>
              <th>Set</th>
            </tr>
            <tr>
              <td>Captain</td>
              <BoolRadioCell
                defaultChecked={user.roles.captain}
                name='captain'
                onChange={onCaptainChange}
                refs={captainRefs}
              />
            </tr>
            <tr>
              <td>Game mode</td>
              <td colSpan={2}>
                <select
                  ref={captainGameModeRef}
                  name='captain_game_mode'
                  defaultValue={user.roles.captain_game_mode ?? 'none'}
                  onChange={onCaptainGameModeChange}
                  key={user.roles.captain_game_mode ?? 'none' /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */}
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
                <BoolRadioCell defaultChecked={user.roles[role]} name={role} />
              </tr>
            ))}
          </table>
          <button type='submit' className='modal-submit-button'>
            {busy ? 'Updating...' : 'Update'}
          </button>
        </Form>
      </Modal>
    </>
  );
}

type BoolRadioCellProps = {
  defaultChecked: boolean;
  name: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  refs?: readonly [RefObject<HTMLInputElement>, RefObject<HTMLInputElement>];
};

function BoolRadioCell({ defaultChecked, name, onChange, refs }: BoolRadioCellProps) {
  return (
    <>
      <td>
        <input
          ref={refs == null ? undefined : refs[0]}
          type='radio'
          name={name}
          defaultChecked={!defaultChecked}
          value='0'
          onChange={onChange}
        />
      </td>
      <td>
        <input
          ref={refs == null ? undefined : refs[1]}
          type='radio'
          name={name}
          defaultChecked={defaultChecked}
          value='1'
          onChange={onChange}
        />
      </td>
    </>
  );
}

function Logs() {
  const [logs, logsError] = useApi(getLogs);

  if (logsError != null)
    return <span className='panic'>Failed to load logs: {apiErrorMessage(logsError)}</span>;

  if (logs == null)
    return <span>Loading logs...</span>;

  return (
    <table>
      {logs.map((log) => (
        <tr key={log.id}>
          <td>{log.created_at} [#{log.id}]</td>
          <td className={LogType[log.type]}><LogMessage {...log} /></td>
        </tr>
      ))}
    </table>
  );
}

function LogMessage(log: ILog) {
  if (log.message.startsWith('{plain}'))
    return <span>{log.message.slice(7)}</span>;

  const elements: JSX.Element[] = [];
  const regex = /{creator}|{([^{}]+)}{([^{}]+)}/g;
  let match: RegExpExecArray | null;
  let lastMatchEnd = 0;

  while ((match = regex.exec(log.message)) != null) {
    if (lastMatchEnd !== match.index)
      elements.push(
        <span>{log.message.slice(lastMatchEnd, match.index)}</span>
      );

    elements.push(
      match[1] != null
        ? (
          match[2].startsWith('/')
            ? <Link to={match[2]}>{match[1]}</Link>
            : <a href={match[2]}>{match[1]}</a>
        ) : (
          log.creator == null
            ? <Never />
            : <UserInline user={log.creator} />
        )
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
        <h1>Roles</h1>
        <PermissionsMenu />
      </div>
      <div className='content-block'>
        <h1>API objects</h1>
        <h2>Single</h2>
        <ApiObjectMenu />
        <h2>Bulk</h2>
        <ApiObjectBulkMenu />
      </div>
      <div className='content-block'>
        <h1>Logs</h1>
        <Logs />
      </div>
    </>
  );
}
