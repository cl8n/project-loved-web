import { useState } from 'react';
import { alertApiErrorMessage, updateNominationModeration } from '../api';
import { BeatmapInline } from '../BeatmapInline';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import type { INomination, PartialWithId } from '../interfaces';
import { ModeratorState } from '../interfaces';
import { Modal } from '../Modal';

interface EditModerationProps {
  moderationStarted: boolean;
  nomination: INomination;
  onNominationUpdate: (nomination: PartialWithId<INomination>) => void;
}

export default function EditModeration({
  moderationStarted,
  nomination,
  onNominationUpdate,
}: EditModerationProps) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateNominationModeration(nomination.id, form.state)
      .then((response) => {
        if (
          nomination.moderator_state !== ModeratorState.needsChange &&
          response.body.moderator_state === ModeratorState.needsChange
        ) {
          window.alert(
            'Make sure to contact the mapper about any required changes! They may not be receiving notifications for discussion posts.',
          );
        }

        onNominationUpdate(response.body);
      })
      .then(then)
      .catch(alertApiErrorMessage)
      .finally(() => setModalOpen(false));
  };

  return (
    <>
      <button
        type='button'
        onClick={() => setModalOpen(true)}
        className={`flex-no-shrink fake-a${moderationStarted ? '' : ' important-bad'}`}
      >
        Edit moderation
      </button>
      <Modal close={() => setModalOpen(false)} open={modalOpen}>
        <h2>
          <BeatmapInline
            artist={nomination.overwrite_artist}
            beatmapset={nomination.beatmapset}
            title={nomination.overwrite_title}
          />
          {' moderation'}
        </h2>
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <table>
            <tr>
              <td>
                <label htmlFor='state'>State</label>
              </td>
              <td>
                <select
                  name='state'
                  required
                  defaultValue={nomination.moderator_state}
                  data-value-type='int'
                  key={
                    nomination.moderator_state /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */
                  }
                >
                  <option value={ModeratorState.unchecked}>Not checked</option>
                  <option value={ModeratorState.needsChange}>
                    Needs change, posted on discussion
                  </option>
                  <option value={ModeratorState.sentToReview}>Sent to content review</option>
                  <option value={ModeratorState.good}>All good!</option>
                  <option value={ModeratorState.notAllowed}>Not allowed</option>
                </select>
              </td>
            </tr>
          </table>
          <button type='submit' className='modal-submit-button'>
            {busy ? 'Updating...' : 'Update'}
          </button>
        </Form>
      </Modal>
    </>
  );
}
