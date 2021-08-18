import { FormattedMessage } from 'react-intl';
import { getTeam, useApi } from '../api';
import TeamList from './TeamList';

export default function Team() {
  const teamApi = useApi(getTeam);

  return (
    <>
      <div className='content-block'>
        <FormattedMessage
          defaultMessage='Current team'
          description='Team listing group title'
          tagName='h1'
        />
        <TeamList current={true} teamApi={teamApi} />
      </div>
      <div className='content-block'>
        <FormattedMessage
          defaultMessage='Alumni'
          description='Team listing group title'
          tagName='h1'
        />
        <TeamList current={false} teamApi={teamApi} />
      </div>
    </>
  );
}
