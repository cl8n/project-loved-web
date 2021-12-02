import { useState } from 'react';
import { addUser, alertApiErrorMessage } from '../api';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import type { IUser } from '../interfaces';

interface UserAdderProps {
  onUserAdd: (user: IUser) => void;
}

export default function UserAdder({ onUserAdd }: UserAdderProps) {
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return addUser(form.username)
      .then((response) => onUserAdd(response.body))
      .then(then)
      .catch(alertApiErrorMessage);
  };

  return (
    <Form busyState={[busy, setBusy]} className='flex-left' onSubmit={onSubmit}>
      <label htmlFor='username'>Username</label>
      <input type='text' name='username' required />
      <button type='submit'>{busy ? 'Adding...' : 'Add'}</button>
    </Form>
  );
}
