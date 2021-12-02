import type { ReactNode } from 'react';
import { useState } from 'react';
import { alertApiErrorMessage, updateUserRoles } from '../api';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import type { IUserRole, IUserWithRoles } from '../interfaces';
import ListInputCustom from '../ListInputCustom';
import { Modal } from '../Modal';
import { gameModeLongName, gameModes } from '../osu-helpers';
import { allRoles, roleNames } from '../permissions';
import { UserInline } from '../UserInline';

function renderRoleInput(role: IUserRole | null, renderRemoveButton: () => ReactNode) {
  return (
    <div className='box'>
      <label htmlFor='role_id'>Role</label>
      <select
        name='role_id'
        required
        defaultValue={role?.role_id}
        key={
          role?.role_id /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */
        }
      >
        <option hidden value=''>
          Select a role
        </option>
        {allRoles.map((roleId) => (
          <option key={roleId} value={roleId}>
            {roleNames[roleId]}
          </option>
        ))}
      </select>
      <label htmlFor='game_mode'>Game mode</label>
      <select
        name='game_mode'
        required
        defaultValue={role?.game_mode}
        key={
          role?.game_mode /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */
        }
      >
        <option hidden value=''>
          Select a game mode
        </option>
        <option value={-1}>None</option>
        {gameModes.map((gameMode) => (
          <option key={gameMode} value={gameMode}>
            {gameModeLongName(gameMode)}
          </option>
        ))}
      </select>
      <label htmlFor='alumni'>Alumni</label>
      <input type='checkbox' name='alumni' defaultChecked={role?.alumni} />
      {renderRemoveButton()}
    </div>
  );
}

interface UserRolesEditorProps {
  onRolesUpdate: (userRoles: IUserRole[]) => void;
  user: IUserWithRoles;
}

export default function UserRolesEditor({ onRolesUpdate, user }: UserRolesEditorProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (_, then, controls) => {
    const controlsCount = controls.length;
    const roles: Partial<IUserRole>[] = [];
    let currentRole = -1;

    for (let i = 0; i < controlsCount; i++) {
      const control = controls[i] as any; // TODO: typing

      // Assume the controls are in correct order
      if (control.name === 'role_id') {
        currentRole++;
        roles.push({ user_id: user.id });
      } else if (control instanceof HTMLButtonElement) {
        continue;
      }

      roles[currentRole][control.name as keyof IUserRole] =
        control.type === 'checkbox' ? control.checked : parseInt(control.value);
    }

    return updateUserRoles(user.id, roles as IUserRole[])
      .then(() => onRolesUpdate(roles as IUserRole[]))
      .then(then)
      .catch(alertApiErrorMessage)
      .finally(() => setModalOpen(false));
  };

  return (
    <>
      <td>
        <button type='button' onClick={() => setModalOpen(true)} className='fake-a'>
          Edit roles
        </button>
      </td>
      <Modal close={() => setModalOpen(false)} open={modalOpen}>
        <h2>
          Editing <UserInline user={user} />
        </h2>
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <ListInputCustom items={user.roles} renderItemInput={renderRoleInput} />
          <button type='submit' className='modal-submit-button'>
            {busy ? 'Updating...' : 'Update'}
          </button>
        </Form>
      </Modal>
    </>
  );
}
