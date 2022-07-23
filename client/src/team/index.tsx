import type { ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { getTeam, useApi } from '../api';
import useTitle from '../useTitle';
import TeamList from './TeamList';

export default function Team() {
  useTitle('Contributors');
  const teamApi = useApi(getTeam);

  return (
    <>
      <div className='warning-box'>
        <FormattedMessage
          defaultMessage='
            The osu!standard captains are currently taking applications for new captains to help
            review and select maps for Loved voting. <formLink>Apply with the Google form!</formLink>
          '
          description='[Team] osu!standard captain application notice'
          values={{
            formLink: (c: ReactNode) => (
              <a href='https://docs.google.com/forms/d/1HJkBYTRYePM8y0j9dGftQxQOn_e49XYzcb8Xi74gIRM/viewform'>
                {c}
              </a>
            ),
          }}
        />
      </div>
      <div className='content-block'>
        <FormattedMessage
          defaultMessage='Current'
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
