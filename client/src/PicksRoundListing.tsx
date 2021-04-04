import { Link, useHistory } from 'react-router-dom';
import { addRound, apiErrorMessage, getRounds, useApi } from './api';
import type { IRound } from './interfaces';
import { Never } from './Never';
import { useOsuAuth } from './osuAuth';
import { canWriteAs } from './permissions';
import PostDate from './round/PostDate';

type RoundProps = IRound & {
  nomination_count: number;
  // TODO: nominations_done: number;
};

function Round(round: RoundProps) {
  //const notDone = props.nominations_done !== props.nomination_count;
  //const percent = props.nominations_done / props.nomination_count * 100;

  return (
    <div className='box'>
      <h2>
        <Link to={`/admin/picks/${round.id}`}>{round.name} [#{round.id}]</Link>
      </h2>
      <div className='flex-bar'>
        <PostDate round={round} />
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
  const history = useHistory();

  const onClick = () => {
    if (!window.confirm('Are you sure you want to create a new round?'))
      return;

    addRound()
      .then((response) => history.push(`/admin/picks/${response.body.id}`))
      .catch((error) => window.alert(apiErrorMessage(error))); // TODO: show error better
  };

  return (
    <p>
      <button onClick={onClick} type='button'>
        Add round
      </button>
    </p>
  );
}

export function PicksRoundListing() {
  const authUser = useOsuAuth().user;

  if (authUser == null)
    return <Never />;

  return (
    <>
      <h1>Rounds</h1>
      {canWriteAs(authUser, 'news') &&
        <AddRound />
      }
      <PicksRoundListingInner />
    </>
  );
}
