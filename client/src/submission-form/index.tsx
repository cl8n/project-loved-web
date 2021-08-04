import { Link } from 'react-router-dom';
import { loginUrl, useOsuAuth } from '../osuAuth';
import InnerForm from './InnerForm';

export default function SubmissionForm() {
  const authUser = useOsuAuth().user;

  return (
    <>
      <h1>Submit a map for Loved!</h1>
      <p>Filling out this form helps <Link to='/team'>captains</Link> decide which maps to nominate for Loved in the monthly polls. Even if a map has already been <Link to='/'>submitted</Link>, you can add your thoughts about the map here.</p>
      <p>Some things to keep in mind:</p>
      <ul>
        <li>What you write on this form will be visible publicly, so don't write something that you don't want others to see. You don't have to fill in the reason field if you don't want to.</li>
        <li>If the map you submit is either very unpopular or completely unplayable, captains may never check it. Please only submit maps that you believe would add genuine value to the Loved category.</li>
        <li>The map you submit may never be nominated for Loved, even if it does have some merit. Currently, the rate that maps get Loved is limited, so it's possible that the captains will continually find better picks than the map you submit.</li>
        <li><s>After you submit a map, you can check on its status on <Link to='/'>the "Submissions" page</Link>.</s> <b>Coming soon!</b></li>
      </ul>
      {authUser == null
        ? <b>You must <a href={loginUrl}>log in</a> to fill out the form.</b>
        : <InnerForm />
      }
    </>
  );
}
