import { Fragment } from 'react';
import { getCaptains, useApi } from './api';
import { GameMode, IUser } from './interfaces';
import { UserInline } from './UserInline';

type ICaptain = IUser & {
  roles: IUser['roles'] & {
    captain: true;
    captain_game_mode: GameMode;
  };
};

const gameModes = [
  'osu!standard',
  'osu!taiko',
  'osu!catch',
  'osu!mania',
];

export function Captains() {
  return (
    <>
      <h1>Captains</h1>
      <CaptainsInner />
    </>
  );
}

function CaptainsInner() {
  const [captains, captainsError] = useApi<ICaptain[]>(getCaptains);

  if (captainsError != null)
    return <span className='panic'>Failed to load captains: {captainsError.message}</span>;

  if (captains == null)
    return <span>Loading captains...</span>;

  const captainsByGameMode: ICaptain[][] = [[], [], [], []];
  captains.forEach((captain) => {
    captainsByGameMode[captain.roles.captain_game_mode].push(captain);
  });

  return (
    <>
      {gameModes.map((gameModeName, gameMode) => (
        <Fragment key={gameMode}>
          <h2>{gameModeName}</h2>
          <ul>
            {captainsByGameMode[gameMode].map((captain) => (
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
