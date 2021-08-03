import { ResponseError } from 'superagent';
import { apiErrorMessage, GetTeamResponseBody } from '../api';
import { gameModeLongName, gameModes } from '../osu-helpers';
import UserList from './UserList';

type TeamListProps = {
  current: boolean;
  teamApi: readonly [GetTeamResponseBody | undefined, ResponseError | undefined, unknown];
};

export default function TeamList({ current, teamApi }: TeamListProps) {
  const [team, teamError] = teamApi;

  if (teamError != null)
    return <span className='panic'>Failed to load team members: {apiErrorMessage(teamError)}</span>;

  if (team == null)
    return <span>Loading team members...</span>;

  const teamUsers = current ? team.current : team.alumni;

  return (
    <div className='team-list'>
      {gameModes.map((gameMode) => {
        const gameModeUsers = teamUsers[gameMode];

        return gameModeUsers != null && (
          <UserList
            key={gameMode}
            title={gameModeLongName(gameMode) + ' Captains'}
            users={gameModeUsers}
          />
        );
      })}
      {teamUsers.news != null &&
        <UserList
          title='News editors / Managers'
          users={teamUsers.news}
        />
      }
      {teamUsers.metadata != null &&
        <UserList
          title='Metadata reviewers'
          users={teamUsers.metadata}
        />
      }
      {teamUsers.moderator != null &&
        <UserList
          title='Moderators'
          users={teamUsers.moderator}
        />
      }
      {teamUsers.dev != null &&
        <UserList
          title='Developers'
          users={teamUsers.dev}
        />
      }
      {teamUsers.other != null &&
        <UserList
          title='Other'
          users={teamUsers.other}
        />
      }
    </div>
  );
}
