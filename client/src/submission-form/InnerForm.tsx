import { gameModeLongName, gameModes, gameModeShortName } from 'loved-bridge/beatmaps/gameMode';
import { useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { addReviews, alertApiErrorMessage } from '../api';
import { autoHeightRef } from '../auto-height';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import { reviewScoreClasses, reviewScoreTitle } from '../submission-listing/helpers';

const messages = defineMessages({
  selectScore: {
    defaultMessage: 'Select a score',
    description: '[Reviews] Placeholder value for review score selector',
  },
  submit: {
    defaultMessage: 'Submit',
    description: '[General] Submit button',
  },
  submitAndStay: {
    defaultMessage: 'Submit and stay on page',
    description:
      "[Submission form] Submit button that doesn't navigate to the submissions page afterward",
  },
  submitting: {
    defaultMessage: 'Submitting...',
    description: '[General] Submit button when in progress',
  },
});

export default function InnerForm() {
  const intl = useIntl();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    const beatmapsetMatch = (form.beatmapset as string).match(/(?:\/(?:beatmapset)?s\/|^)(\d+)/);

    if (beatmapsetMatch == null) {
      window.alert('Invalid beatmapset link or ID');
      return null;
    }

    if (form.gameModes.length === 0) {
      window.alert('Select at least one game mode');
      return null;
    }

    const beatmapsetId = parseInt(beatmapsetMatch[1]);

    return addReviews(beatmapsetId, form.gameModes, form.reason, form.score)
      .then(() => {
        if (form.submitValue) {
          navigate(`/submissions/${gameModeShortName(form.gameModes[0])}`, { state: beatmapsetId });
        }
      })
      .then(then)
      .catch(alertApiErrorMessage);
  };

  return (
    <Form busyState={[busy, setBusy]} className='box spacer-margin' onSubmit={onSubmit}>
      <h2>
        <label htmlFor='beatmapset'>
          <FormattedMessage
            defaultMessage='Beatmapset link or ID'
            description='[Submission form] Submission form beatmapset input prompt'
          />
        </label>
      </h2>
      <input
        type='text'
        name='beatmapset'
        required
        pattern='(?:.*/(?:beatmapset)?s/)?\d+.*'
        size={51}
      />
      <h2>
        <label htmlFor='gameModes'>
          <FormattedMessage
            defaultMessage='For which game modes do you want this map to be Loved?'
            description='[Submission form] Submission form game mode input prompt'
          />
        </label>
      </h2>
      <table>
        <tbody>
          {gameModes.map((gameMode) => (
            <tr key={gameMode}>
              <td>
                <input type='checkbox' name='gameModes' value={gameMode} data-value-type='int' />
              </td>
              <td>{gameModeLongName(gameMode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>
        <label htmlFor='score'>
          <FormattedMessage
            defaultMessage='How much do you support this map being Loved?'
            description='[Submission form] Score input prompt'
          />
        </label>
      </h2>
      <select name='score' required data-value-type='int'>
        <option hidden value=''>
          {intl.formatMessage(messages.selectScore)}
        </option>
        {[3, 1].map((score) => (
          <option key={score} className={reviewScoreClasses[score + 3]} value={score}>
            {reviewScoreTitle(intl, score)}
          </option>
        ))}
      </select>
      <h2>
        <label htmlFor='reason'>
          <FormattedMessage
            defaultMessage='Why do you want this map to be Loved?'
            description='[Submission form] Reason input prompt'
          />
        </label>
      </h2>
      <textarea name='reason' required style={{ width: '100%' }} ref={autoHeightRef} />
      <div className='flex-left spacer-margin'>
        <button type='submit' data-submit-value='leave'>
          {intl.formatMessage(busy ? messages.submitting : messages.submit)}
        </button>
        <button type='submit'>
          {intl.formatMessage(busy ? messages.submitting : messages.submitAndStay)}
        </button>
      </div>
    </Form>
  );
}
