import { useState } from 'react';
import { apiErrorMessage, updateRound } from '../api';
import { autoHeightRef } from '../auto-height';
import { Form, FormSubmitHandler } from '../dom-helpers';
import { IRound, PartialWithId } from '../interfaces';
import { inputDateTime } from '../date-format';

type RoundEditorProps = {
  close: () => void;
  onRoundUpdate: (round: PartialWithId<IRound>) => void;
  round: IRound;
};

export default function RoundEditor({ close, onRoundUpdate, round }: RoundEditorProps) {
  const [busy, setBusy] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateRound(round.id, form)
      .then(() => onRoundUpdate({ id: round.id, ...form }))
      .then(then)
      .catch((error) => window.alert(apiErrorMessage(error))) // TODO: show error better
      .finally(close);
  };

  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <div className='form-grid'>
        <label htmlFor='name'>Title</label>
        <input
          type='text'
          name='name'
          defaultValue={round.name}
          required
        />
        <label htmlFor='news_posted_at'>Post date (UTC)</label>
        <input
          type='datetime-local'
          name='news_posted_at'
          defaultValue={inputDateTime(round.news_posted_at)}
          data-value-type='mySqlDate'
          pattern='[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}'
        />
        <label htmlFor='news_intro_preview'>Intro preview</label>
        <textarea
          name='news_intro_preview'
          defaultValue={round.news_intro_preview}
          ref={autoHeightRef}
        />
        <label htmlFor='news_intro'>Intro</label>
        <textarea
          name='news_intro'
          defaultValue={round.news_intro}
          ref={autoHeightRef}
        />
        <label htmlFor='news_outro'>Outro</label>
        <textarea
          name='news_outro'
          defaultValue={round.news_outro}
          ref={autoHeightRef}
        />
      </div>
      <div className='flex-left'>
        <button type='submit'>{busy ? 'Updating...' : 'Update'}</button>
        <button type='button' onClick={close}>Cancel</button>
      </div>
    </Form>
  );
}
