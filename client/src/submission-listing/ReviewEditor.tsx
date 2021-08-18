import { useState } from 'react';
import { useIntl } from 'react-intl';
import { addOrUpdateReview, apiErrorMessage } from '../api';
import { autoHeightRef } from '../auto-height';
import { BeatmapInline } from '../BeatmapInline';
import { Form, FormSubmitHandler } from '../dom-helpers';
import { GameMode, IBeatmapset, IReview } from '../interfaces';
import { Modal } from '../Modal';
import { reviewScoreClasses, reviewScoreMessages, selectableReviewScores } from './helpers';

interface ReviewEditorProps {
  beatmapset: IBeatmapset;
  gameMode: GameMode;
  onReviewUpdate: (review: IReview) => void;
  review?: IReview;
}

export default function ReviewEditor({ beatmapset, gameMode, onReviewUpdate, review }: ReviewEditorProps) {
  const intl = useIntl();
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return addOrUpdateReview(beatmapset.id, gameMode, form.reason, form.score)
      .then((response) => onReviewUpdate(response.body))
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error))) // TODO: show error better
      .finally(() => setModalOpen(false));
  };

  return (
    <>
      <td>
        <button
          type='button'
          onClick={() => setModalOpen(true)}
          className={`fake-a${review?.score ? '' : ' important-bad'}`}
        >
          {review == null ? 'Add review' : 'Update review'}
        </button>
      </td>
      <Modal
        close={() => setModalOpen(false)}
        open={modalOpen}
      >
        <h2>
          <BeatmapInline beatmapset={beatmapset} gameMode={gameMode} />
          {' review'}
        </h2>
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <table>
            <tbody>
              <tr>
                <td><label htmlFor='score'>Score</label></td>
                <td>
                  <select
                    name='score'
                    required
                    defaultValue={review?.score}
                    data-value-type='int'
                    key={review?.score /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */}
                  >
                    <option hidden />
                    {selectableReviewScores.map((score) => (
                      <option key={score} className={reviewScoreClasses[score + 3]} value={score}>
                        {intl.formatMessage(reviewScoreMessages[score + 3])} ({intl.formatNumber(score, { signDisplay: 'exceptZero' })})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td><label htmlFor='reason'>Reason</label></td>
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
              ? (review == null ? 'Adding...' : 'Updating...')
              : (review == null ? 'Add' : 'Update')
            }
          </button>
        </Form>
      </Modal>
    </>
  );
}
