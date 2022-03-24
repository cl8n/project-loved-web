import useTitle from '../../useTitle';
import LogList from './LogList';

export default function Logs() {
  useTitle('Logs');

  return (
    <>
      <h1>Logs</h1>
      <LogList />
    </>
  );
}
