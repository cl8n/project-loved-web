import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRounds } from './api';
import type { IRound } from './interfaces';

type RoundProps = IRound & {
  nominations_count: number;
  nominations_done: number;
};

function Round(props: RoundProps) {
  const notDone = props.nominations_done !== props.nominations_count;
  const percent = props.nominations_done / props.nominations_count * 100;
  const posted = props.news_posted_at != null && new Date() >= props.news_posted_at;

  return (
    <div className='box'>
      <Link to={`/admin/picks/${props.id}`}>{props.name} [#{props.id}]</Link>
      <div className='flex-bar'>
        <span>{posted ? 'Posted' : 'Posting'} at {props.news_posted_at}</span>
        {notDone &&
          <span className='progress'>
            {props.nominations_done} / {props.nominations_count} ({percent}%)
          </span>
        }
      </div>
    </div>
  );
}

export function PicksRoundListing() {
  const [rounds, setRounds] = useState<RoundProps[]>();

  useEffect(() => {
    getRounds()
      .then((response) => setRounds(response.body));
  }, []);

  return rounds == null
    ? <span>Loading...</span>
    : <>{rounds.map((round) => <Round key={round.id} {...round} />)}</>;
}
