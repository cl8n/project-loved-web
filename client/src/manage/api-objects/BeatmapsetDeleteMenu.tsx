import { useState } from 'react';
import { alertApiErrorMessage, deleteBeatmapset } from '../../api';
import type { FormSubmitHandler } from '../../dom-helpers';
import { Form } from '../../dom-helpers';

export default function BeatmapsetDeleteMenu() {
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
