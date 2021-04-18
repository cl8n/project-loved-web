import { Fragment } from 'react';
import { apiErrorMessage, getTeam, useApi } from '../api';
import { IUserWithoutRoles } from '../interfaces';
import { gameModeLongName, gameModes } from '../osu-helpers';
import { UserInline } from '../UserInline';

export default function Team() {
  const [team, teamError] = useApi(getTeam);

  if (teamError != null)
    return <span className='panic'>Failed to load team members: {apiErrorMessage(teamError)}</span>;

  if (team == null)
    return <span>Loading team members...</span>;

  return (
    <>
      <div className='content-block'>
        <h1>Current team</h1>
        {gameModes.map((gameMode) => {
          const users = team.current[gameMode];

          return users != null && (
            <Fragment key={gameMode}>
              <h2>{gameModeLongName(gameMode)} captains</h2>
              <UserList users={users} />
            </Fragment>
          );
        })}
        {team.current.general != null &&
          <>
            <h2>Other</h2>
            <UserList users={team.current.general} />
          </>
        }
      </div>
      <div className='content-block'>
        <h1>Alumni</h1>
        {gameModes.map((gameMode) => {
          const users = team.alumni[gameMode];

          return users != null && (
            <Fragment key={gameMode}>
              <h2>{gameModeLongName(gameMode)}</h2>
              <UserList users={users} />
            </Fragment>
          );
        })}
        {team.alumni.general != null &&
          <>
            <h2>Other</h2>
            <UserList users={team.alumni.general} />
          </>
        }
      </div>
    </>
  );
}

type UserListProps = {
  users: IUserWithoutRoles[];
};

function UserList({ users }: UserListProps) {
  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          <UserInline user={user} />
        </li>
      ))}
    </ul>
  );
}
