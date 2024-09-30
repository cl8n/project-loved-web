import { FormattedMessage } from 'react-intl';
import { getTeam, useApi } from '../api';
import useTitle from '../useTitle';
import TeamList from './TeamList';

export default function Team() {
  useTitle('Contributors');
  const teamApi = useApi(getTeam);

  return (
    <>
      {/* <div className='warning-box'>
        The [mode] captains are looking to expand their team. Apply using{' '}
        <a href='[form]'>this Google form</a> if you're interested!
      </div> */}
      <div className='content-block'>
        <FormattedMessage
          defaultMessage='Current contributors'
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
