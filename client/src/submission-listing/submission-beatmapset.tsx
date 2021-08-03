import { useMemo, useState } from 'react';
import { dateFromString } from '../date-format';
import SubmissionsDropdown from './submissions-dropdown';
import { displayRange } from './helpers';
import Beatmap from '../Beatmap';
import { UserInline } from '../UserInline';
import { GetSubmissionsResponseBody } from '../api';

interface SubmissionBeatmapsetProps {
  beatmapset: GetSubmissionsResponseBody['beatmapsets'][0];
  usersById: GetSubmissionsResponseBody['usersById'];
}

export default function SubmissionBeatmapset({ beatmapset, usersById }: SubmissionBeatmapsetProps) {
  const [expanded, setExpanded] = useState(false);

  const mapper = useMemo(() => (
    <UserInline name={beatmapset.creator_name} user={usersById[beatmapset.creator_id]} />
  ), [beatmapset, usersById]);
  const year = useMemo(() => displayRange([
    dateFromString(beatmapset.submitted_at).getFullYear(),
    dateFromString(beatmapset.updated_at).getFullYear(),
  ]), [beatmapset]);

  return (
    <>
      <tr>
        <td><Beatmap beatmapset={beatmapset} /></td>
        <td>{mapper}</td>
        <td>{beatmapset.reviews.length > 0 ? 'Who knows' : 'Pending'}</td>
        <td>{beatmapset.play_count}</td>
        <td>{beatmapset.favorite_count}</td>
        <td>{beatmapset.favorite_count * 10 + beatmapset.play_count}</td>
        <td>{year}</td>
        <td>???</td>
        <td>???</td>
        <td>???</td>
        <td>
          <button
            type='button'
            className='fake-a'
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? 'Close' : 'Expand'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9}>
            <SubmissionsDropdown
              submissions={beatmapset.submissions}
              usersById={usersById}
            />
          </td>
        </tr>
      )}
    </>
  );
}
