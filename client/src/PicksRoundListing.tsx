import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addRound, apiErrorMessage, getRounds, useApi } from './api';
import { Form, FormSubmitHandler } from './dom-helpers';
import type { IRound } from './interfaces';
import { Modal } from './Modal';
import { Never } from './Never';
import { useOsuAuth } from './osuAuth';
import { canWriteAs } from './permissions';

type RoundProps = IRound & {
  nomination_count: number;
  // TODO: nominations_done: number;
};

function Round(round: RoundProps) {
  //const notDone = props.nominations_done !== props.nomination_count;
  //const percent = props.nominations_done / props.nomination_count * 100;
  const posted = round.news_posted_at != null && new Date() >= round.news_posted_at;

  return (
    <div className='box'>
      <h2>
        <Link to={`/admin/picks/${round.id}`}>{round.name} [#{round.id}]</Link>
      </h2>
      <div className='flex-bar'>
        <span>{posted ? 'Posted' : 'Posting'} at {round.news_posted_at}</span>
        <span>{round.nomination_count} nominations</span>
      </div>
    </div>
  );

  /*
  {notDone &&
          <span className='progress'>
            {props.nominations_done} / {props.nomination_count} ({percent}%)
          </span>
        }
        */
}

function PicksRoundListingInner() {
  const [rounds, roundsError] = useApi(getRounds);

  if (roundsError != null)
    return <span className='panic'>Failed to load rounds: {apiErrorMessage(roundsError)}</span>;

  if (rounds == null)
    return <span>Loading rounds...</span>;

  return <>{rounds.map((round) => <Round key={round.id} {...round} />)}</>;
}

function AddRound() {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSubmit: FormSubmitHandler = (form, then) => {
    return addRound(form.name, new Date(form.newsPostAt))
      .then(() => {}) // TODO: set rounds
      .then(then)
      .catch(() => {}) // TODO: show error
      .finally(() => setModalOpen(false));
  };

  return (
    <>
      <p>
        <button
          className='fake-a'
          onClick={() => setModalOpen(true)}
          type='button'
        >
          Add round
        </button>
      </p>
      <Modal
        close={() => setModalOpen(false)}
        open={modalOpen}
      >
        <h2>Add round</h2>
        <Form busyState={[busy, setBusy]} onSubmit={onSubmit}>
          <table className='center-block'>
            <tr>
              <td>Title</td>
              <td><input type='text' name='name' required /></td>
            </tr>
            <tr>
              <td>Post date</td>
              <td><input type='date' name='newsPostAt' required /></td>
            </tr>
          </table>
          <button type='submit' className='modal-submit-button'>
            {busy ? 'Adding...' : 'Add'}
          </button>
        </Form>
      </Modal>
    </>
  );
}

export function PicksRoundListing() {
  const authUser = useOsuAuth().user;

  if (authUser == null)
    return <Never />;

  return (
    <>
      <h1>Rounds</h1>
      {canWriteAs(authUser) &&
        <AddRound />
      }
      <PicksRoundListingInner />
    </>
  );
}
