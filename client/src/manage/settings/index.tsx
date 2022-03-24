import useTitle from '../../useTitle';
import SettingsForm from './SettingsForm';

export default function Settings() {
  useTitle('Site settings');

  return (
    <>
      <h1>Site settings</h1>
      <SettingsForm />
    </>
  );
}
