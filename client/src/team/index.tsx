import { FormattedMessage } from 'react-intl';
import { getTeam, useApi } from '../api';
import useTitle from '../useTitle';
import TeamList from './TeamList';

export default function Team() {
  useTitle('The team');
  const teamApi = useApi(getTeam);

  return (
    <>
      <div className='content-block'>
        <FormattedMessage
          defaultMessage='Current team'
          description='[Team] Team listing group title'
          tagName='h1'
        />
        <TeamList current={true} teamApi={teamApi} />
      </div>
      <div className='content-block'>
        <FormattedMessage
          defaultMessage='Alumni'
          description='[Team] Team listing group title'
          tagName='h1'
        />
        <TeamList current={false} teamApi={teamApi} />
      </div>
    </>
  );
}
