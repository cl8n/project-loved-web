import { useState } from 'react';
import { addUser, alertApiErrorMessage } from '../api';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import type { IUser } from '../interfaces';

interface MapperConsentAdderProps {
  onConsentAdd: (user: IUser) => void;
}

export default function MapperConsentAdder({ onConsentAdd }: MapperConsentAdderProps) {
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return addUser(form.username, form.storeBanned)
      .then((response) => onConsentAdd(response.body))
      .then(then)
      .catch(alertApiErrorMessage);
  };

  return (
    <Form busyState={[busy, setBusy]} className='flex-left' onSubmit={onSubmit}>
      <label htmlFor='username'>Username</label>
      <input type='text' name='username' required />
      <label htmlFor='storeBanned'>User may be banned</label>
      <input type='checkbox' name='storeBanned' data-value-type='check' />
      <button type='submit'>{busy ? 'Adding...' : 'Add'}</button>
    </Form>
  );
}
