import { useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { addOrUpdateReview, apiErrorMessage } from '../api';
import { autoHeightRef } from '../auto-height';
import { BeatmapInline } from '../BeatmapInline';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import type { GameMode, IBeatmapset, IReview } from '../interfaces';
import { Modal } from '../Modal';
import { useOsuAuth } from '../osuAuth';
import { reviewScoreClasses, reviewScoreMessages, selectableReviewScores } from './helpers';

const messages = defineMessages({
  notAllowed: {
    defaultMessage: 'Not allowed',
    description: 'Aggregate review score shown on submissions table for maps that cannot be Loved',
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
      .catch((error) => window.alert(apiErrorMessage(error))) // TODO: show error better
      .finally(() => setModalOpen(false));
  };

  return (
    <Modal close={() => setModalOpen(false)} open={modalOpen}>
      <h2>
        <BeatmapInline beatmapset={beatmapset} gameMode={gameMode} />
        {' review'}
      </h2>
      <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
        <table>
          <tbody>
            <tr>
              <td>
                <label htmlFor='score'>Score</label>
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
                    Select a score
                  </option>
                  {authUser?.roles.captain && // TODO: Not dumb workaround for God role
                    selectableReviewScores.map((score) => (
                      <option key={score} className={reviewScoreClasses[score + 3]} value={score}>
                        {intl.formatMessage(reviewScoreMessages[score + 3])} (
                        {intl.formatNumber(score, { signDisplay: 'exceptZero' })})
                      </option>
                    ))}
                  <option className='review-score--3' value='-4'>
                    {intl.formatMessage(messages.notAllowed)}
                  </option>
                </select>
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor='reason'>Reason</label>
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
          {busy
            ? review == null
              ? 'Adding...'
              : 'Updating...'
            : review == null
            ? 'Add'
            : 'Update'}
        </button>
      </Form>
    </Modal>
  );
}
