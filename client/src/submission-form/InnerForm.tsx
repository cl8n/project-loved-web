import { useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { addSubmission, apiErrorMessage } from '../api';
import { autoHeightRef } from '../auto-height';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import { gameModeLongName, gameModes, gameModeShortName } from '../osu-helpers';

const messages = defineMessages({
  submit: {
    defaultMessage: 'Submit',
    description: 'Submit button',
  },
  submitAndStay: {
    defaultMessage: 'Submit and stay on page',
    description: "Submit button that doesn't navigate to the submissions page afterward",
  },
  submitting: {
    defaultMessage: 'Submitting...',
    description: 'Submit button when in progress',
  },
});

export default function InnerForm() {
  const history = useHistory();
  const intl = useIntl();
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

    return addSubmission(beatmapsetId, form.gameModes, form.reason)
      .then(() => {
        if (form.submitValue)
          history.push(`/submissions/${gameModeShortName(form.gameModes[0])}`, beatmapsetId);
      })
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error better
  };

  return (
    <Form busyState={[busy, setBusy]} className='box spacer-margin' onSubmit={onSubmit}>
      <h2>
        <label htmlFor='beatmapset'>
          <FormattedMessage
            defaultMessage='Beatmapset link or ID'
            description='Submission form beatmapset input prompt'
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
            description='Submission form game mode input prompt'
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
        <label htmlFor='reason'>
          <FormattedMessage
            defaultMessage='Why do you want this map to be Loved? <fade>(optional)</fade>'
            description='Submission form reason input prompt'
            values={{
              fade: (c: string) => <span className='faded'>{c}</span>,
            }}
          />
        </label>
      </h2>
      <textarea name='reason' style={{ width: '100%' }} ref={autoHeightRef} />
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
