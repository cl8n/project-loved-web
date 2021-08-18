import { Form, FormSubmitHandler } from '../dom-helpers';
import { useState } from 'react';
import { addSubmission, apiErrorMessage } from '../api';
import { gameModeLongName, gameModes } from '../osu-helpers';
import { autoHeightRef } from '../auto-height';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

const messages = defineMessages({
  submit: {
    defaultMessage: 'Submit',
    description: 'Submit button',
  },
  submitting: {
    defaultMessage: 'Submitting...',
    description: 'Submit button when in progress',
  },
});

export default function InnerForm() {
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

    return addSubmission(parseInt(beatmapsetMatch[1]), form.gameModes, form.reason)
      .then(() => { /* TODO: Navigate to this submission under the map on Submissions */ })
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
      <input type='text' name='beatmapset' required pattern='(?:/(?:beatmapset)?s/|^)\d+' />
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
              <td><input type='checkbox' name='gameModes' value={gameMode} data-value-type='int' /></td>
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
      <button type='submit' className='spacer-margin'>
        {intl.formatMessage(busy ? messages.submitting : messages.submit)}
      </button>
    </Form>
  );
}
