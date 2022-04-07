import useTitle from '../../useTitle';
import SettingsForm from './SettingsForm';

export default function Settings() {
  useTitle('Site settings');

  return (
    <>
      <h1>Site settings</h1>
      <div className='warning-box'>
        Don't share anything from this page! Let an admin know immediately if that happens.
      </div>
      <SettingsForm />
    </>
  );
}
