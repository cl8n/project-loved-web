import { useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { GetSubmissionsResponseBody } from '../api';
import Beatmap from '../Beatmap';
import { dateFromString } from '../date-format';
import Help from '../Help';
import calendarIcon from '../images/icons8/calendar.png';
import circleIcon from '../images/icons8/circle.png';
import heartIcon from '../images/icons8/heart.png';
import musicalNotesIcon from '../images/icons8/musical-notes.png';
import playIcon from '../images/icons8/play.png';
import { GameMode, IReview } from '../interfaces';
import { Never } from '../Never';
import { UserInline } from '../UserInline';
import { ToggleableColumnsState } from './helpers';
import ReviewEditor from './ReviewEditor';
import SubmissionsList from './SubmissionsList';

const messages = defineMessages({
  close: {
    defaultMessage: 'Close',
    description: 'Button to close forms, dropdowns, modals, etc.',
  },
  expand: {
    defaultMessage: 'Expand',
    description: 'Button to expand dropdowns',
  },
  failedVoting: {
    defaultMessage: 'Failed voting',
    description: 'Aggregate review score shown on submissions table for maps that failed community voting',
  },
  inVoting: {
    defaultMessage: 'In voting',
    description: 'Aggregate review score shown on submissions table for maps currently in community voting',
  },
  notAllowed: {
    defaultMessage: 'Not allowed',
    description: 'Aggregate review score shown on submissions table for maps that cannot be Loved',
  },
  notAllowedNoConsent: {
    defaultMessage: 'The mapper has requested for this map to not be involved with the Loved category.',
    description: 'Help text explaining that a map cannot be Loved due to its mapper not consenting to it',
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
  lovedByVoting: {
    defaultMessage: 'Loved by vote',
    description: 'Beatmap status shown on submissions table for maps that passed community voting',
  },
  ranked: {
    defaultMessage: 'Ranked',
    description: 'Beatmap status',
  },
  approved: {
    defaultMessage: 'Approved',
    description: 'Beatmap status',
  },
  qualified: {
    defaultMessage: 'Qualified',
    description: 'Beatmap status',
  },
  loved: {
    defaultMessage: 'Loved',
    description: 'Beatmap status',
  },
});

interface SubmissionBeatmapsetProps {
  beatmapset: GetSubmissionsResponseBody['beatmapsets'][0];
  canReview: boolean;
  columns: ToggleableColumnsState;
  filterToApproved: boolean;
  gameMode: GameMode;
  onReviewUpdate: (review: IReview) => void;
  review?: IReview;
  usersById: GetSubmissionsResponseBody['usersById'];
}

export default function SubmissionBeatmapset({ beatmapset, canReview, columns, filterToApproved, gameMode, onReviewUpdate, review, usersById }: SubmissionBeatmapsetProps) {
  const intl = useIntl();
  const { state: submittedBeatmapsetId } = useLocation<number | undefined>();
  const [expanded, setExpanded] = useState(submittedBeatmapsetId === beatmapset.id);
  const year = useMemo(() => {
    const submittedAt = dateFromString(beatmapset.submitted_at).getFullYear();
    const updatedAt = dateFromString(beatmapset.updated_at).getFullYear();

    return submittedAt === updatedAt
      ? <span>{submittedAt}</span>
      : <span>{submittedAt}<br />{updatedAt}</span>;
  }, [beatmapset]);
  const diffCount = useMemo(() => {
    const inThisMode = beatmapset.beatmap_counts[gameMode];
    const inOtherModes = Object.values(beatmapset.beatmap_counts).reduce((sum, count) => sum += count, 0) - inThisMode;

    return inOtherModes === 0
      ? <span>{intl.formatNumber(inThisMode)}</span>
      : <span>{intl.formatNumber(inThisMode)}<br />(+{intl.formatNumber(inOtherModes)})</span>;
  }, [beatmapset, gameMode, intl]);

  return (
    <>
      <tr className={`submission-beatmapset${expanded ? '' : ' closed'}${beatmapset.poll_in_progress ? ' in-voting' : ''}`}>
        <td className='normal-wrap'>
          <div data-beatmapset-id={beatmapset.id} />
          <Beatmap beatmapset={beatmapset} />
        </td>
        <td><UserInline name={beatmapset.creator_name} user={usersById[beatmapset.creator_id]} /></td>
        {filterToApproved
          ? <StatusCell beatmapset={beatmapset} />
          : <PriorityCell beatmapset={beatmapset} />
        }
        {columns.score && <td>{intl.formatNumber(beatmapset.score)}</td>}
        {columns.playCount && <td><img alt='' src={playIcon} className='content-icon' /> {intl.formatNumber(beatmapset.play_count)}</td>}
        {columns.favoriteCount && <td><img alt='' src={heartIcon} className='content-icon' /> {intl.formatNumber(beatmapset.favorite_count)}</td>}
        {columns.year && (
          <td>
            <div className='icon-label-container'>
              <img alt='' src={calendarIcon} className='content-icon' />
              {year}
            </div>
          </td>
        )}
        {columns.difficultyCount && (
          <td>
            <div className='icon-label-container'>
              <img alt='' src={circleIcon} className='content-icon' />
              {diffCount}
            </div>
          </td>
        )}
        {columns.bpm && <td><img alt='' src={musicalNotesIcon} className='content-icon' /> {intl.formatNumber(beatmapset.modal_bpm)}</td>}
        <td>
          <button
            type='button'
            className='fake-a'
            onClick={() => setExpanded((prev) => !prev)}
          >
            {intl.formatMessage(expanded ? messages.close : messages.expand)}
          </button>
          {canReview && (
            <>
              <br />
              <ReviewEditor
                beatmapset={beatmapset}
                gameMode={gameMode}
                onReviewUpdate={onReviewUpdate}
                review={review}
              />
            </>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td className='normal-wrap' colSpan={10}>
            <SubmissionsList
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

  if (beatmapset.poll_in_progress) {
    return <td className='priority high'>{intl.formatMessage(messages.inVoting)}</td>;
  }

  if (beatmapset.strictly_rejected) {
    return <td className='priority rejected'>{intl.formatMessage(messages.notAllowed)}</td>;
  }

  if (beatmapset.consent === false) {
    return (
      <td className='priority rejected'>
        {intl.formatMessage(messages.notAllowed)}
        {' '}
        <Help>{intl.formatMessage(messages.notAllowedNoConsent)}</Help>
      </td>
    );
  }

  if (beatmapset.poll != null && !beatmapset.poll.passed) {
    return (
      <td className='priority'>
        <a href={`https://osu.ppy.sh/community/forums/topics/${beatmapset.poll.topic_id}`}>
          {intl.formatMessage(messages.failedVoting)}
        </a>
      </td>
    );
  }

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

interface StatusCellProps {
  beatmapset: GetSubmissionsResponseBody['beatmapsets'][0];
}

function StatusCell({ beatmapset }: StatusCellProps) {
  const intl = useIntl();

  // TODO: Support per-mode status for maps loved in only one mode or etc
  if (beatmapset.ranked_status === 4) {
    if (beatmapset.poll?.passed) {
      return (
        <td className='priority'>
          <a href={`https://osu.ppy.sh/community/forums/topics/${beatmapset.poll.topic_id}`}>
            {intl.formatMessage(messages.lovedByVoting)}
          </a>
        </td>
      );
    }

    return <td className='priority high'>{intl.formatMessage(messages.loved)}</td>;
  }

  if (beatmapset.ranked_status === 3) {
    return <td className='priority low'>{intl.formatMessage(messages.qualified)}</td>;
  }

  if (beatmapset.ranked_status === 2) {
    return <td className='priority medium'>{intl.formatMessage(messages.approved)}</td>;
  }

  if (beatmapset.ranked_status === 1) {
    return <td className='priority medium'>{intl.formatMessage(messages.ranked)}</td>;
  }

  return <td><Never /></td>;
}
