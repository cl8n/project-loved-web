import { useState } from 'react';
import { alertApiErrorMessage, apiErrorMessage, getNewsAuthors, updateRound, useApi } from '../api';
import { autoHeightRef } from '../auto-height';
import { inputDateTime } from '../date-format';
import type { FormSubmitHandler } from '../dom-helpers';
import { Form } from '../dom-helpers';
import type { IRound, IUser, PartialWithId } from '../interfaces';

interface RoundEditorProps {
  close: () => void;
  onRoundUpdate: (round: PartialWithId<IRound & { news_author: IUser }>) => void;
  round: IRound;
}

export default function RoundEditor({ close, onRoundUpdate, round }: RoundEditorProps) {
  const [busy, setBusy] = useState(false);
  const [newsAuthors, newsAuthorsError] = useApi(getNewsAuthors);

  if (newsAuthorsError != null) {
    return (
      <span className='panic'>
        Failed to load news authors: {apiErrorMessage(newsAuthorsError)}
      </span>
    );
  }

  if (newsAuthors == null) {
    return <span>Loading news authors...</span>;
  }

  const onSubmit: FormSubmitHandler = (form, then) => {
    return updateRound(round.id, form)
      .then(({ body }) => onRoundUpdate(body))
      .then(then)
      .catch(alertApiErrorMessage)
      .finally(close);
  };

  return (
    <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
      <div className='form-grid'>
        <label htmlFor='name'>Title</label>
        <input type='text' name='name' defaultValue={round.name} required size={30} />
        <label htmlFor='news_author_id'>Author</label>
        <select
          name='news_author_id'
          required
          defaultValue={round.news_author_id}
          data-value-type='int'
          key={
            round.news_author_id /* TODO: Workaround for https://github.com/facebook/react/issues/21025 */
          }
        >
          {newsAuthors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.name}
            </option>
          ))}
        </select>
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
        <textarea name='news_intro' defaultValue={round.news_intro} ref={autoHeightRef} />
        <label htmlFor='news_outro'>Outro</label>
        <textarea name='news_outro' defaultValue={round.news_outro} ref={autoHeightRef} />
      </div>
      <div className='flex-left'>
        <button type='submit'>{busy ? 'Updating...' : 'Update'}</button>
        <button type='button' onClick={close}>
          Cancel
        </button>
      </div>
    </Form>
  );
}
