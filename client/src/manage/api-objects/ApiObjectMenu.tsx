import { useState } from 'react';
import { alertApiErrorMessage, isApiObjectType, updateApiObject } from '../../api';
import type { FormSubmitHandler } from '../../dom-helpers';
import { Form } from '../../dom-helpers';

export default function ApiObjectMenu() {
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    const id = form.id;
    const type = form.type;

    if (isNaN(id) || !isApiObjectType(type)) {
      return null;
    }

    return updateApiObject(type, id).then(then).catch(alertApiErrorMessage);
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
    </Form>
  );
}
