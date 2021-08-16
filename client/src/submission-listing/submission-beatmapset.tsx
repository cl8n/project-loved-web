import { useMemo, useState } from 'react';
import { dateFromString } from '../date-format';
import SubmissionsDropdown from './submissions-dropdown';
import { displayRange } from './helpers';
import Beatmap from '../Beatmap';
import { UserInline } from '../UserInline';
import { GetSubmissionsResponseBody } from '../api';
import ReviewEditor from './ReviewEditor';
import { GameMode, IReview } from '../interfaces';

interface SubmissionBeatmapsetProps {
  beatmapset: GetSubmissionsResponseBody['beatmapsets'][0];
  canReview: boolean;
  gameMode: GameMode;
  onReviewUpdate: (review: IReview) => void;
  review?: IReview;
  usersById: GetSubmissionsResponseBody['usersById'];
}

export default function SubmissionBeatmapset({ beatmapset, canReview, gameMode, onReviewUpdate, review, usersById }: SubmissionBeatmapsetProps) {
  const [expanded, setExpanded] = useState(false);
  const year = useMemo(() => displayRange([
    dateFromString(beatmapset.submitted_at).getFullYear(),
    dateFromString(beatmapset.updated_at).getFullYear(),
  ]), [beatmapset]);

  const beatmapCountThisMode = beatmapset.beatmap_info[gameMode].beatmap_count;
  const beatmapCountOtherModes = Object.values(beatmapset.beatmap_info).reduce((sum, info) => sum += info.beatmap_count, 0) - beatmapCountThisMode;

  return (
    <>
      <tr>
        <td className='normal-wrap'><Beatmap beatmapset={beatmapset} /></td>
        <td><UserInline name={beatmapset.creator_name} user={usersById[beatmapset.creator_id]} /></td>
        <PriorityCell beatmapset={beatmapset} />
        <td>{beatmapset.score}</td>
        <td>{beatmapset.play_count}</td>
        <td>{beatmapset.favorite_count}</td>
        <td>{year}</td>
        <td>
          {beatmapCountThisMode}
          {beatmapCountOtherModes > 0 && ` (+${beatmapCountOtherModes})`}
        </td>
        <td>{beatmapset.beatmap_info[gameMode].modal_bpm}</td>
        <td>
          <button
            type='button'
            className='fake-a'
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? 'Close' : 'Expand'}
          </button>
        </td>
        {canReview && (
          <ReviewEditor
            beatmapset={beatmapset}
            gameMode={gameMode}
            onReviewUpdate={onReviewUpdate}
            review={review}
          />
        )}
      </tr>
      {expanded && (
        <tr>
          <td colSpan={10}>
            <SubmissionsDropdown
              reviews={beatmapset.reviews}
              submissions={beatmapset.submissions}
              usersById={usersById}
            />
          </td>
        </tr>
      )}
    </>
  );
}

const priorities = [
  [5, 'High', 'high'],
  [0, 'Medium', 'medium'],
  [-5, 'Low', 'low'],
  [-Infinity, 'Rejected', 'rejected'],
] as const;

interface PriorityCellProps {
  beatmapset: GetSubmissionsResponseBody['beatmapsets'][0];
}

function PriorityCell({ beatmapset }: PriorityCellProps) {
  if (beatmapset.reviews.length === 0) {
    return <td className='priority low'>Pending</td>;
  }

  const [, priortyText, priorityClass] = priorities.find((p) => beatmapset.review_score >= p[0])!;

  return (
    <td className={'priority ' + priorityClass}>
      {priortyText} ({beatmapset.review_score > 0 && '+'}{beatmapset.review_score})
    </td>
  );
}
