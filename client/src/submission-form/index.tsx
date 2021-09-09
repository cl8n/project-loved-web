import type { ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';
import { loginUrl, useOsuAuth } from '../osuAuth';
import InnerForm from './InnerForm';

export default function SubmissionForm() {
  const authUser = useOsuAuth().user;
  const submissionsLink = (c: ReactNode) => <Link to='/submissions/osu'>{c}</Link>;

  return (
    <>
      <FormattedMessage
        defaultMessage='Submit a map for Loved!'
        description='Submission form title'
        tagName='h1'
      />
      <FormattedMessage
        defaultMessage='
          <p>Filling out this form helps <teamLink>captains</teamLink> decide which maps to nominate for
          Loved in the monthly polls. Even if a map has already been <submissionsLink>submitted</submissionsLink>,
          you can add your thoughts about the map here.</p>
          <p>Some things to keep in mind:</p>
        '
        description='Submission form intro'
        values={{
          p: (c: ReactNode) => <p>{c}</p>,
          submissionsLink,
          teamLink: (c: ReactNode) => <Link to='/team'>{c}</Link>,
        }}
      />
      <ul>
        <FormattedMessage
          defaultMessage="
            What you write on this form will be visible publicly, so don't write something that you don't want others
            to see. You don't have to fill in the reason field if you don't want to.
          "
          description='Submission form list item 1'
          tagName='li'
        />
        <FormattedMessage
          defaultMessage='
            If the map you submit is either very unpopular or completely unplayable, captains may never check it.
            Please only submit maps that you believe would add genuine value to the Loved category.
          '
          description='Submission form list item 2'
          tagName='li'
        />
        <FormattedMessage
          defaultMessage="
            The map you submit may never be nominated for Loved, even if it does have some merit. Currently, the rate
            that maps get Loved is limited, so it's possible that the captains will continually find better picks than
            the map you submit.
          "
          description='Submission form list item 3'
          tagName='li'
        />
        <FormattedMessage
          defaultMessage='
            After you submit a map, you can check on its status on
            <submissionsLink>the "Submissions" page</submissionsLink>.
          '
          description='Submission form list item 4'
          tagName='li'
          values={{ submissionsLink }}
        />
      </ul>
      {authUser == null
        ? <FormattedMessage
            defaultMessage='You must <a>log in</a> to fill out the form.'
            description='Submission form login prompt'
            tagName='b'
            values={{
              a: (c: ReactNode) => <a href={loginUrl}>{c}</a>,
            }}
          />
        : <InnerForm />
      }
    </>
  );
}
