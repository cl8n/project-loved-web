import { useMemo, useState } from 'react';
import { dateFromString } from '../date-format';
import SubmissionsDropdown from './submissions-dropdown';
import { displayRange } from './helpers';
import Beatmap from '../Beatmap';
import { UserInline } from '../UserInline';
import { GetSubmissionsResponseBody } from '../api';
import ReviewEditor from './ReviewEditor';
import { GameMode, IReview } from '../interfaces';
import { defineMessages, useIntl } from 'react-intl';

const messages = defineMessages({
  close: {
    defaultMessage: 'Close',
    description: 'Button to close forms, dropdowns, modals, etc.',
  },
  expand: {
    defaultMessage: 'Expand',
    description: 'Button to expand dropdowns',
  },
  high: {
    defaultMessage: 'High',
    description: 'Aggregate review score shown on submissions table',
  },
  medium: {
    defaultMessage: 'Medium',
    description: 'Aggregate review score shown on submissions table',
  },
  low: {
    defaultMessage: 'Low',
    description: 'Aggregate review score shown on submissions table',
  },
  rejected: {
    defaultMessage: 'Rejected',
    description: 'Aggregate review score shown on submissions table',
  },
  pending: {
    defaultMessage: 'Pending',
    description: 'Aggregate review score shown on submissions table for maps with no reviews',
  },
});

interface SubmissionBeatmapsetProps {
  beatmapset: GetSubmissionsResponseBody['beatmapsets'][0];
  canReview: boolean;
  gameMode: GameMode;
  onReviewUpdate: (review: IReview) => void;
  review?: IReview;
  usersById: GetSubmissionsResponseBody['usersById'];
}

export default function SubmissionBeatmapset({ beatmapset, canReview, gameMode, onReviewUpdate, review, usersById }: SubmissionBeatmapsetProps) {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);
  const year = useMemo(() => displayRange([
    dateFromString(beatmapset.submitted_at).getFullYear(),
    dateFromString(beatmapset.updated_at).getFullYear(),
  ]), [beatmapset]);

  const beatmapCountThisMode = beatmapset.beatmap_info[gameMode].beatmap_count;
  const beatmapCountOtherModes = Object.values(beatmapset.beatmap_info).reduce((sum, info) => sum += info.beatmap_count, 0) - beatmapCountThisMode;

  return (
    <>
      <tr className={`submission-beatmapset${expanded ? '' : ' closed'}`}>
        <td className='normal-wrap'><Beatmap beatmapset={beatmapset} /></td>
        <td><UserInline name={beatmapset.creator_name} user={usersById[beatmapset.creator_id]} /></td>
        <PriorityCell beatmapset={beatmapset} />
        <td>{intl.formatNumber(beatmapset.score)}</td>
        <td>{intl.formatNumber(beatmapset.play_count)}</td>
        <td>{intl.formatNumber(beatmapset.favorite_count)}</td>
        <td>{year}</td>
        <td>
          {intl.formatNumber(beatmapCountThisMode)}
          {beatmapCountOtherModes > 0 && ` (+${intl.formatNumber(beatmapCountOtherModes)})`}
        </td>
        <td>{intl.formatNumber(beatmapset.beatmap_info[gameMode].modal_bpm)}</td>
        <td>
          <button
            type='button'
            className='fake-a'
            onClick={() => setExpanded((prev) => !prev)}
          >
            {intl.formatMessage(expanded ? messages.close : messages.expand)}
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
          <td className='normal-wrap submissions' colSpan={canReview ? 11 : 10}>
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
  [5, messages.high, 'high'],
  [0, messages.medium, 'medium'],
  [-5, messages.low, 'low'],
  [-Infinity, messages.rejected, 'rejected'],
] as const;

interface PriorityCellProps {
  beatmapset: GetSubmissionsResponseBody['beatmapsets'][0];
}

function PriorityCell({ beatmapset }: PriorityCellProps) {
  const intl = useIntl();

  if (beatmapset.reviews.length === 0) {
    return <td className='priority low'>{intl.formatMessage(messages.pending)}</td>;
  }

  const [, priorityMessage, priorityClass] = priorities.find((p) => beatmapset.review_score >= p[0])!;

  return (
    <td className={'priority ' + priorityClass}>
      {intl.formatMessage(priorityMessage)} ({intl.formatNumber(beatmapset.review_score, { signDisplay: 'exceptZero' })})
    </td>
  );
}
