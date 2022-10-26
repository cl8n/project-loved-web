import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { Role } from 'loved-bridge/tables';
import { useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { addOrUpdateReview, alertApiErrorMessage } from '../api';
import { autoHeightRef } from '../auto-height';
import { BeatmapInline } from '../BeatmapInline';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import type { IBeatmapset, IReview } from '../interfaces';
import { Modal } from '../Modal';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import { reviewScoreClasses, reviewScoreTitle } from './helpers';

const messages = defineMessages({
  notAllowed: {
    defaultMessage: 'Not allowed',
    description:
      '[Submissions] Aggregate review score shown on submissions table for maps that cannot be Loved',
  },
  selectScore: {
    defaultMessage: 'Select a score',
    description: '[Reviews] Placeholder value for review score selector',
  },

  add: {
    defaultMessage: 'Add',
    description: '[General] Add button',
  },
  adding: {
    defaultMessage: 'Adding...',
    description: '[General] Add button when in progress',
  },
  update: {
    defaultMessage: 'Update',
    description: '[General] Update button',
  },
  updating: {
    defaultMessage: 'Updating...',
    description: '[General] Update button when in progress',
  },
});

interface ReviewEditorProps {
  beatmapset: IBeatmapset;
  gameMode: GameMode;
  modalState: [boolean, (modalOpen: boolean) => void];
  onReviewUpdate: (review: IReview) => void;
  review?: IReview;
}

export default function ReviewEditor({
  beatmapset,
  gameMode,
  modalState,
  onReviewUpdate,
  review,
}: ReviewEditorProps) {
  const authUser = useOsuAuth().user;
  const intl = useIntl();
  const [busy, setBusy] = useState(false);

  const [modalOpen, setModalOpen] = modalState;
  const onSubmit: FormSubmitHandler = (form, then) => {
    if (
      form.score < -3 &&
      !window.confirm(
        'The "Not allowed" score rejects the map regardless of what other captains have said. Are you sure you want to do this?',
      )
    ) {
      return null;
    }

    return addOrUpdateReview(beatmapset.id, gameMode, form.reason, form.score)
      .then((response) => onReviewUpdate(response.body))
      .then(then)
      .catch(alertApiErrorMessage)
      .finally(() => setModalOpen(false));
  };
  const selectableReviewScores = [
    3,
    review?.score === 2 && 2,
    1,
    -1,
    review?.score === -2 && -2,
    -3,
  ].filter((score) => score !== false) as number[];

  return (
    <Modal close={() => setModalOpen(false)} open={modalOpen}>
      <FormattedMessage
        defaultMessage='{beatmapset} review'
        description='[Reviews] Title of review modal'
        tagName='h2'
        values={{ beatmapset: <BeatmapInline beatmapset={beatmapset} gameMode={gameMode} /> }}
      />
      <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
        <table>
          <tbody>
            <tr>
              <td>
                <label htmlFor='score'>
                  <FormattedMessage
                    defaultMessage='Score'
                    description='[Reviews] Review score input label'
                  />
                </label>
              </td>
              <td>
                <select
                  name='score'
                  required
                  defaultValue={review?.score}
                  data-value-type='int'
                  key={
                    review?.score /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */
                  }
                >
                  <option hidden value=''>
                    {intl.formatMessage(messages.selectScore)}
                  </option>
                  {selectableReviewScores.map((score) => (
                    <option key={score} className={reviewScoreClasses[score + 3]} value={score}>
                      {reviewScoreTitle(intl, score)}
                    </option>
                  ))}
                  {hasRole(authUser, Role.captain, gameMode) && (
                    <option className='review-score--3' value='-4'>
                      {intl.formatMessage(messages.notAllowed)}
                    </option>
                  )}
                </select>
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor='reason'>
                  <FormattedMessage
                    defaultMessage='Reason'
                    description='[Reviews] Review reason input label'
                  />
                </label>
              </td>
              <td>
                <textarea
                  name='reason'
                  required
                  defaultValue={review?.reason}
                  ref={autoHeightRef}
                />
              </td>
            </tr>
          </tbody>
        </table>
        <button type='submit' className='modal-submit-button'>
          {intl.formatMessage(
            busy
              ? review == null
                ? messages.adding
                : messages.updating
              : review == null
              ? messages.add
              : messages.update,
          )}
        </button>
      </Form>
    </Modal>
  );
}
