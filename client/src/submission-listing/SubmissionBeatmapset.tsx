import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import type { GetSubmissionsResponseBody } from '../api';
import { alertApiErrorMessage, deleteReview } from '../api';
import Beatmap from '../Beatmap';
import { dateFromString } from '../date-format';
import { classNames } from '../dom-helpers';
import Help from '../Help';
import calendarIcon from '../images/icons8/calendar.png';
import circleIcon from '../images/icons8/circle.png';
import heartIcon from '../images/icons8/heart.png';
import musicalNotesIcon from '../images/icons8/musical-notes.png';
import playIcon from '../images/icons8/play.png';
import type { IReview } from '../interfaces';
import { GameMode } from '../interfaces';
import { Never } from '../Never';
import { useOsuAuth } from '../osuAuth';
import { UserInline } from '../UserInline';
import type { ToggleableColumnsState } from './helpers';
import { submissionIsNew } from './helpers';
import type { SubmittedBeatmapset } from './interfaces';
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
    description:
      'Aggregate review score shown on submissions table for maps that failed community voting',
  },
  inVoting: {
    defaultMessage: 'In voting',
    description:
      'Aggregate review score shown on submissions table for maps currently in community voting',
  },
  nominated: {
    defaultMessage: 'Nominated',
    description:
      'Aggregate review score shown on submissions table for maps nominated by captains for future voting',
  },
  nominatedForRound: {
    defaultMessage: 'This map has been nominated for {roundName}.',
    description: 'Help text explaining that a map has been nominated',
  },
  notAllowed: {
    defaultMessage: 'Not allowed',
    description: 'Aggregate review score shown on submissions table for maps that cannot be Loved',
  },
  notAllowedMapperBanned: {
    defaultMessage: 'The mapset host is banned.',
    description: 'Help text explaining that a map cannot be Loved due to its mapper being banned',
  },
  notAllowedNoConsent: {
    defaultMessage:
      'The mapper has requested for this map to not be involved with the Loved category.',
    description:
      'Help text explaining that a map cannot be Loved due to its mapper not consenting to it',
  },
  notAllowedTooShort: {
    defaultMessage: 'Every map in this set is too short (under 30 seconds).',
    description: 'Help text explaining that a map cannot be Loved due to its length',
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
  beatmapset: SubmittedBeatmapset;
  canReview: boolean;
  columns: ToggleableColumnsState;
  filterToApproved: boolean;
  gameMode: GameMode;
  onReviewDelete: (() => void) | null;
  onReviewUpdate: (review: IReview) => void;
  review?: IReview;
  usersById: GetSubmissionsResponseBody['usersById'];
}

export default function SubmissionBeatmapset({
  beatmapset,
  canReview,
  columns,
  filterToApproved,
  gameMode,
  onReviewDelete,
  onReviewUpdate,
  review,
  usersById,
}: SubmissionBeatmapsetProps) {
  const authUser = useOsuAuth().user;
  const intl = useIntl();
  const { state: submittedBeatmapsetId } = useLocation<number | undefined>();
  const [expanded, setExpanded] = useState(submittedBeatmapsetId === beatmapset.id);
  const [hovered, setHovered] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const year = useMemo(() => {
    const submittedAt = dateFromString(beatmapset.submitted_at).getFullYear();
    const updatedAt = dateFromString(beatmapset.updated_at).getFullYear();

    return submittedAt === updatedAt ? (
      <span>{submittedAt}</span>
    ) : (
      <span>
        {submittedAt}
        <br />
        {updatedAt}
      </span>
    );
  }, [beatmapset]);
  const diffCount = useMemo(() => {
    const inThisMode = beatmapset.beatmap_counts[gameMode];
    const inOtherModes =
      Object.values(beatmapset.beatmap_counts).reduce((sum, count) => (sum += count), 0) -
      inThisMode;

    return inOtherModes === 0 ? (
      <span>{intl.formatNumber(inThisMode)}</span>
    ) : (
      <span>
        {intl.formatNumber(inThisMode)}
        <br />
        (+{intl.formatNumber(inOtherModes)})
      </span>
    );
  }, [beatmapset, gameMode, intl]);

  const onDeleteReviewClick = () => {
    if (!window.confirm('Are you sure you want to delete your review?')) {
      return;
    }

    deleteReview(review!.id).then(onReviewDelete!).catch(alertApiErrorMessage);
  };
  const onClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest('a, button, .help, .modal-overlay') == null
    ) {
      if (event.ctrlKey) {
        setReviewModalOpen(true);
        return;
      }

      setExpanded((prev) => !prev);

      if (event.target.closest('.submission-beatmapset') == null) {
        setHovered(false);
      }
    }
  };
  const onMouseEnter = () => setHovered(true);
  const onMouseLeave = () => setHovered(false);
  const reviewAngry = canReview && authUser?.roles.captain && !review?.score; // TODO: Not dumb workaround for God role

  return (
    <>
      <tr
        className={classNames({
          closed: !expanded,
          hover: hovered,
          'in-voting': beatmapset.poll?.in_progress ?? false,
          'low-favorites': gameMode === GameMode.osu && beatmapset.favorite_count < 30,
          new: beatmapset.submissions.some(submissionIsNew),
          'submission-beatmapset': true,
        })}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <td>
          <span className='selector-indicator'>{expanded ? '▲' : '▼'}</span>{' '}
          {reviewAngry && <span className='important-bad'>★</span>}
        </td>
        <td className='normal-wrap'>
          <div data-beatmapset-id={beatmapset.id} />
          <div className='submission-selector' />
          <Beatmap beatmapset={beatmapset} />
        </td>
        <td>
          <UserInline name={beatmapset.creator_name} user={usersById[beatmapset.creator_id]} />
        </td>
        {filterToApproved ? (
          <StatusCell beatmapset={beatmapset} />
        ) : (
          <PriorityCell beatmapset={beatmapset} />
        )}
        {columns.score && <td>{intl.formatNumber(beatmapset.score)}</td>}
        {columns.playCount && (
          <td>
            <img alt='' src={playIcon} className='content-icon' />{' '}
            {intl.formatNumber(beatmapset.play_count)}
          </td>
        )}
        {columns.favoriteCount && (
          <td>
            <img alt='' src={heartIcon} className='content-icon' />{' '}
            {intl.formatNumber(beatmapset.favorite_count)}
          </td>
        )}
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
        {columns.bpm && (
          <td>
            <img alt='' src={musicalNotesIcon} className='content-icon' />{' '}
            {intl.formatNumber(beatmapset.modal_bpm)}
          </td>
        )}
      </tr>
      {expanded && (
        <tr
          className={classNames({ hover: hovered })}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <td>
            <div className='submission-selector' />
          </td>
          <td className='normal-wrap fix-column-layout' colSpan={9}>
            {canReview && (
              <div className='review-button-container'>
                {review != null && (
                  <button type='button' onClick={onDeleteReviewClick} className='angry'>
                    Delete review
                  </button>
                )}{' '}
                <button type='button' onClick={() => setReviewModalOpen(true)}>
                  Review
                </button>{' '}
                <Help>
                  You can also hold <kbd>Ctrl</kbd> while clicking on the mapset to open the review
                  modal.
                </Help>
              </div>
            )}
            <SubmissionsList
              reviews={beatmapset.reviews}
              submissions={beatmapset.submissions}
              usersById={usersById}
            />
          </td>
        </tr>
      )}
      <ReviewEditor
        beatmapset={beatmapset}
        gameMode={gameMode}
        modalState={[reviewModalOpen, setReviewModalOpen]}
        onReviewUpdate={onReviewUpdate}
        review={review}
      />
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
  beatmapset: SubmittedBeatmapset;
}

function PriorityCell({ beatmapset }: PriorityCellProps) {
  const intl = useIntl();

  if (beatmapset.poll?.in_progress) {
    return (
      <td className='priority'>
        <a href={`https://osu.ppy.sh/community/forums/topics/${beatmapset.poll.topic_id}`}>
          {intl.formatMessage(messages.inVoting)}
        </a>
      </td>
    );
  }

  if (beatmapset.nominated_round_name != null) {
    return (
      <td className='priority high'>
        {intl.formatMessage(messages.nominated)}{' '}
        <Help>
          {intl.formatMessage(messages.nominatedForRound, {
            roundName: beatmapset.nominated_round_name,
          })}
        </Help>
      </td>
    );
  }

  if (beatmapset.strictly_rejected) {
    return <td className='priority rejected'>{intl.formatMessage(messages.notAllowed)}</td>;
  }

  if (beatmapset.consent === false) {
    return (
      <td className='priority rejected'>
        {intl.formatMessage(messages.notAllowed)}{' '}
        <Help>{intl.formatMessage(messages.notAllowedNoConsent)}</Help>
      </td>
    );
  }

  if (beatmapset.creator.banned) {
    return (
      <td className='priority rejected'>
        {intl.formatMessage(messages.notAllowed)}{' '}
        <Help>{intl.formatMessage(messages.notAllowedMapperBanned)}</Help>
      </td>
    );
  }

  if (beatmapset.maximum_length < 30) {
    return (
      <td className='priority rejected'>
        {intl.formatMessage(messages.notAllowed)}{' '}
        <Help>{intl.formatMessage(messages.notAllowedTooShort)}</Help>
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

  const [, priorityMessage, priorityClass] = priorities.find(
    (p) => beatmapset.review_score >= p[0],
  )!;

  return (
    <td className={'priority ' + priorityClass}>
      {intl.formatMessage(priorityMessage)} (
      {intl.formatNumber(beatmapset.review_score, {
        maximumFractionDigits: 2,
        signDisplay: 'exceptZero',
      })}
      )
    </td>
  );
}

interface StatusCellProps {
  beatmapset: SubmittedBeatmapset;
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

  return (
    <td>
      <Never />
    </td>
  );
}
