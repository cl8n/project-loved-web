import { defineMessages, useIntl } from 'react-intl';
import type { ResponseError } from 'superagent';
import type { GetTeamResponseBody } from '../api';
import { apiErrorMessage } from '../api';
import { gameModeLongName, gameModes } from '../osu-helpers';
import UserList from './UserList';

const messages = defineMessages({
  captains: {
    defaultMessage: '{gameMode} captains',
    description: 'Team listing title'
  },
  developer: {
    defaultMessage: 'Developers',
    description: 'Team listing title'
  },
  metadata: {
    defaultMessage: 'Metadata reviewers',
    description: 'Team listing title'
  },
  moderator: {
    defaultMessage: 'Moderators',
    description: 'Team listing title'
  },
  news: {
    defaultMessage: 'News editors / Managers',
    description: 'Team listing title'
  },
  other: {
    defaultMessage: 'Other',
    description: 'Team listing title for any role not explicitly listed'
  },
});

interface TeamListProps {
  current: boolean;
  teamApi: readonly [GetTeamResponseBody | undefined, ResponseError | undefined, unknown];
}

export default function TeamList({ current, teamApi }: TeamListProps) {
  const intl = useIntl();
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
            title={intl.formatMessage(messages.captains, { gameMode: gameModeLongName(gameMode) })}
            users={gameModeUsers}
          />
        );
      })}
      {teamUsers.news != null &&
        <UserList
          title={intl.formatMessage(messages.news)}
          users={teamUsers.news}
        />
      }
      {teamUsers.metadata != null &&
        <UserList
          title={intl.formatMessage(messages.metadata)}
          users={teamUsers.metadata}
        />
      }
      {teamUsers.moderator != null &&
        <UserList
          title={intl.formatMessage(messages.moderator)}
          users={teamUsers.moderator}
        />
      }
      {teamUsers.dev != null &&
        <UserList
          title={intl.formatMessage(messages.developer)}
          users={teamUsers.dev}
        />
      }
      {teamUsers.other != null &&
        <UserList
          title={intl.formatMessage(messages.other)}
          users={teamUsers.other}
        />
      }
    </div>
  );
}
