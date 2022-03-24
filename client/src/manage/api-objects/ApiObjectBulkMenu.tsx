import { useState } from 'react';
import { alertApiErrorMessage, isApiObjectType, updateApiObjectBulk } from '../../api';
import { autoHeightRef } from '../../auto-height';
import type { FormSubmitHandler } from '../../dom-helpers';
import { Form } from '../../dom-helpers';

export default function ApiObjectBulkMenu() {
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
