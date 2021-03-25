import { Fragment } from 'react';
import { apiErrorMessage, getCaptains, useApi } from './api';
import { GameMode } from './interfaces';
import { gameModeLongNames } from './osu-helpers';
import { UserInline } from './UserInline';

export function Captains() {
  return (
    <>
      <h1>Captains</h1>
      <CaptainsInner />
    </>
  );
}

function CaptainsInner() {
  const [captains, captainsError] = useApi(getCaptains);

  if (captainsError != null)
    return <span className='panic'>Failed to load captains: {apiErrorMessage(captainsError)}</span>;

  if (captains == null)
    return <span>Loading captains...</span>;

  return (
    <>
      {gameModeLongNames.map((gameModeName, gameMode: GameMode) => (
        <Fragment key={gameMode}>
          <h2>{gameModeName}</h2>
          <ul>
            {captains[gameMode]?.map((captain) => (
              <li key={captain.id}>
                <UserInline user={captain} />
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
    </>
  );
}
