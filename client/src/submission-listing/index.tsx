import { apiErrorMessage, getSubmissions, useApi } from '../api';
import SubmissionBeatmapset from './submission-beatmapset';
import Help from '../Help';
import { useParams } from 'react-router-dom';
import { gameModeFromShortName } from '../osu-helpers';

export default function SubmissionBeatmapsetListing() {
  const params = useParams<{ gameMode: string; }>();
  const gameMode = gameModeFromShortName(params.gameMode);
  const [submissionsInfo, submissionsInfoError] = useApi(getSubmissions, [gameMode ?? 0]); // FIXME

  if (submissionsInfoError != null)
    return <span className='panic'>Failed to load submissions: {apiErrorMessage(submissionsInfoError)}</span>;

  if (submissionsInfo == null)
    return <span>Loading submissions...</span>;

  return (
    <>
      <h1>Submitted maps</h1>
      <table>
        <tr className='sticky'>
          <th>Beatmapset</th>
          <th>Mapper</th>
          <th>Status</th>
          <th>Plays</th>
          <th>Favorites</th>
          <th>Score <Help text='A placeholder method to sort this listing. Score = Favorites × 10 + Plays' /></th>
          <th>Year</th>
          <th>Difficulties</th>
          <th>BPM</th>
          <th>Length</th>
          <th />
        </tr>
        {submissionsInfo.beatmapsets.map((beatmapset) => (
          <SubmissionBeatmapset
            key={beatmapset.id}
            beatmapset={beatmapset}
            usersById={submissionsInfo.usersById}
          />
        ))}
      </table>
    </>
  );
}
