import { Role } from 'loved-bridge/tables';
import { Link, useNavigate } from 'react-router-dom';
import type { ResponseError } from 'superagent';
import { addRound, alertApiErrorMessage, apiErrorMessage, getRounds, useApi } from './api';
import type { IRound } from './interfaces';
import { useOsuAuth } from './osuAuth';
import { hasRole } from './permissions';
import PostDate from './round/PostDate';
import useTitle from './useTitle';

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
        <Link to={round.id.toString()}>
          {round.name} [#{round.id}]
        </Link>
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

interface PicksRoundListingInnerProps {
  rounds: RoundProps[] | undefined;
  roundsError: ResponseError | undefined;
}

function PicksRoundListingInner({ rounds, roundsError }: PicksRoundListingInnerProps) {
  if (roundsError != null) {
    return <span className='panic'>Failed to load rounds: {apiErrorMessage(roundsError)}</span>;
  }

  if (rounds == null) {
    return <span>Loading rounds...</span>;
  }

  return (
    <>
      {rounds.map((round) => (
        <Round key={round.id} {...round} />
      ))}
    </>
  );
}

function AddRound() {
  const navigate = useNavigate();

  const onClick = () => {
    if (!window.confirm('Are you sure you want to create a new round?')) {
      return;
    }

    addRound()
      .then((response) => navigate(response.body.id.toString()))
      .catch(alertApiErrorMessage);
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
  useTitle('Round listing');
  const authUser = useOsuAuth().user;
  const [rounds, roundsError] = useApi(getRounds);

  return (
    <>
      <div className='content-block'>
        <h1>Current rounds</h1>
        {hasRole(authUser, Role.newsAuthor) && <AddRound />}
        <PicksRoundListingInner rounds={rounds?.incomplete_rounds} roundsError={roundsError} />
        <div className='box'>
          <h2>
            <Link to='planner'>Nomination planner</Link>
          </h2>
        </div>
      </div>
      <div className='content-block'>
        <h1>Past rounds</h1>
        <PicksRoundListingInner rounds={rounds?.complete_rounds} roundsError={roundsError} />
      </div>
    </>
  );
}
