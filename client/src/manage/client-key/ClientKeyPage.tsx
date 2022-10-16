import useTitle from '../../useTitle';
import ClientKey from './ClientKey';

export default function ClientKeyPage() {
  useTitle('Client key');

  return (
    <>
      <h1>Client key</h1>
      <div className='warning-box'>
        Don't share anything from this page! Let an admin know immediately if that happens.
      </div>
      <p>
        Use your key below in the project-loved client to allow it to connect to this website. This
        key is unique to you.
      </p>
      <p>
        <ClientKey />
      </p>
    </>
  );
}
