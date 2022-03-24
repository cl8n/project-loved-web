import useTitle from '../../useTitle';
import ApiObjectBulkMenu from './ApiObjectBulkMenu';
import ApiObjectMenu from './ApiObjectMenu';
import BeatmapsetDeleteMenu from './BeatmapsetDeleteMenu';

export default function ApiObjects() {
  useTitle('API objects');

  return (
    <>
      <h1>API objects</h1>
      <h2>Single</h2>
      <ApiObjectMenu />
      <h2>Bulk</h2>
      <ApiObjectBulkMenu />
      <h2>Delete beatmapset</h2>
      <BeatmapsetDeleteMenu />
    </>
  );
}
