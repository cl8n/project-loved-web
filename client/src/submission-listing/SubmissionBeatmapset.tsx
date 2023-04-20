import { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import { Role } from 'loved-bridge/tables';
import type { MouseEvent, ReactNode } from 'react';
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
import { Never } from '../Never';
import { loginUrl, useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import Tooltip from '../Tooltip';
import { UserInline } from '../UserInline';
import type { ToggleableColumnsState } from './helpers';
import { beatmapsetNotAllowed, reviewIsNew } from './helpers';
import type { SubmittedBeatmapset } from './interfaces';
import ReviewEditor from './ReviewEditor';
import SubmissionsList from './SubmissionsList';

const messages = defineMessages({
  close: {
    defaultMessage: 'Close',
    description: '[General] Button to close forms, dropdowns, modals, etc.',
  },
  deleted: {
    defaultMessage: 'Deleted',
    description:
      '[Submissions] Aggregate review score shown on submissions table for maps that were deleted from osu!',
  },
  deleteReview: {
    defaultMessage: 'Delete review',
    description: '[Reviews] Button to delete own review',
  },
  deleteReviewConfirm: {
    defaultMessage: 'Are you sure you want to delete your review?',
    description: '[Reviews] Confirmation to delete own review on a beatmapset',
  },
  editReview: {
    defaultMessage: 'Edit review',
    description: '[Reviews] Button to edit own review',
  },
  expand: {
    defaultMessage: 'Expand',
    description: '[General] Button to expand dropdowns',
  },
  failedVoting: {
    defaultMessage: 'Failed voting',
    description:
      '[Submissions] Aggregate review score shown on submissions table for maps that failed community voting',
  },
  inVoting: {
    defaultMessage: 'In voting',
    description:
      '[Submissions] Aggregate review score shown on submissions table for maps currently in community voting',
  },
  passedVoting: {
    defaultMessage: 'Passed voting',
    description:
      '[Submissions] Aggregate review score shown on submissions table for maps that passed community voting',
  },
  nominated: {
    defaultMessage: 'Nominated',
    description:
      '[Submissions] Aggregate review score shown on submissions table for maps nominated by captains for future voting',
  },
  nominatedForRound: {
    defaultMessage: 'This map has been nominated for {roundName}.',
    description: '[Submissions] Help text explaining that a map has been nominated',
  },
  notAllowed: {
    defaultMessage: 'Not allowed',
    description:
      '[Submissions] Aggregate review score shown on submissions table for maps that cannot be Loved',
  },
  notAllowedLowFavorites: {
    defaultMessage: 'The map has too few favorites.',
    description:
      '[Submissions] Help text explaining that a map cannot be Loved due to having too few favorites',
  },
  notAllowedMapperBanned: {
    defaultMessage: 'The mapset host is banned.',
    description:
      '[Submissions] Help text explaining that a map cannot be Loved due to its mapper being banned',
  },
  notAllowedNoConsent: {
    defaultMessage:
      'The mapper has requested for this map to not be involved with the Loved category.',
    description:
      '[Submissions] Help text explaining that a map cannot be Loved due to its mapper not consenting to it',
  },
  notAllowedTooShort: {
    defaultMessage: 'Every map in this set is too short (under 20 seconds).',
    description: '[Submissions] Help text explaining that a map cannot be Loved due to its length',
  },
  review: {
    defaultMessage: 'Review',
    description: '[Reviews] Button to add or update own review',
  },
  reviewHelp: {
    defaultMessage:
      'You can also hold {key} while clicking on the mapset to open the review modal.',
    description:
      '[Reviews] Help text explaining that the review modal can be opened with a keyboard shortcut',
  },
  reviewNotLoggedIn: {
    defaultMessage: 'You must <a>log in</a> to post reviews.',
    description: '[Reviews] Help text explaining that reviewing requires being logged in',
  },
  high: {
    defaultMessage: 'High',
    description: '[Submissions] Aggregate review score shown on submissions table',
  },
  medium: {
    defaultMessage: 'Medium',
    description: '[Submissions] Aggregate review score shown on submissions table',
  },
  low: {
    defaultMessage: 'Low',
    description: '[Submissions] Aggregate review score shown on submissions table',
  },
  rejected: {
    defaultMessage: 'Rejected',
    description: '[Submissions] Aggregate review score shown on submissions table',
  },
  pending: {
    defaultMessage: 'Pending',
    description:
      '[Submissions] Aggregate review score shown on submissions table for maps with no reviews',
  },
  lovedByVoting: {
    defaultMessage: 'Loved by vote',
    description:
      '[Submissions] Beatmap status shown on submissions table for maps that passed community voting',
  },
  ranked: {
    defaultMessage: 'Ranked',
    description: '[Beatmaps] Beatmap status',
  },
  approved: {
    defaultMessage: 'Approved',
    description: '[Beatmaps] Beatmap status',
  },
  qualified: {
    defaultMessage: 'Qualified',
    description: '[Beatmaps] Beatmap status',
  },
  loved: {
    defaultMessage: 'Loved',
    description: '[Beatmaps] Beatmap status',
  },
});

interface SubmissionBeatmapsetProps {
  beatmapset: SubmittedBeatmapset;
  columns: ToggleableColumnsState;
  gameMode: GameMode;
  onReviewDelete: (review: IReview) => void;
  onReviewUpdate: (review: IReview) => void;
  showStatus: boolean;
  usersById: GetSubmissionsResponseBody['usersById'];
}

export default function SubmissionBeatmapset({
  beatmapset,
  columns,
  gameMode,
  onReviewDelete,
  onReviewUpdate,
  showStatus,
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

  const possibleToReview = beatmapset.ranked_status <= 0;
  const canReview = possibleToReview && authUser != null;
  const review =
    authUser == null
      ? undefined
      : beatmapset.reviews.find((review) => review.reviewer_id === authUser.id);
  const onDeleteReviewClick = () => {
    if (!window.confirm(intl.formatMessage(messages.deleteReviewConfirm))) {
      return;
    }

    deleteReview(review!.id)
      .then(() => onReviewDelete(review!))
      .catch(alertApiErrorMessage);
  };
  const onClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest('a, button, .help, .modal-overlay') == null
    ) {
      if (canReview && event.ctrlKey) {
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
  const reviewAngry =
    canReview &&
    !beatmapsetNotAllowed(beatmapset) &&
    hasRole(authUser, Role.captain, gameMode, true) &&
    !review?.score;

  return (
    <>
      <tr
        className={classNames({
          closed: !expanded,
          hover: hovered,
          new: beatmapset.reviews.some(reviewIsNew) || beatmapset.submissions.some(reviewIsNew),
          'submission-beatmapset': true,
          voting:
            beatmapset.poll != null && (beatmapset.poll.in_progress || beatmapset.poll.passed),
        })}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <td>
          <span className='selector-indicator'>{expanded ? '▲' : '▼'}</span>{' '}
          {reviewAngry && <span className='angry'>★</span>}
        </td>
        {gameMode === GameMode.mania && columns.keyModes && (
          <td>
            <div className='key-mode-grid'>
              {beatmapset.key_modes.map((keyMode) => (
                <span key={keyMode}>{keyMode}K</span>
              ))}
            </div>
          </td>
        )}
        <td className='normal-wrap fix-column-layout'>
          <div data-beatmapset-id={beatmapset.id} />
          <div className='submission-selector' />
          <Beatmap beatmapset={beatmapset} gameMode={gameMode} />
        </td>
        <td>
          <UserInline name={beatmapset.creator_name} user={usersById[beatmapset.creator_id]} />
        </td>
        {showStatus ? (
          <StatusCell beatmapset={beatmapset} />
        ) : (
          <PriorityCell beatmapset={beatmapset} />
        )}
        {columns.rating && <RatingCell beatmapset={beatmapset} />}
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
          <td className='normal-wrap' colSpan={11}>
            {canReview ? (
              <div className='review-button-container'>
                {review != null && (
                  <button type='button' onClick={onDeleteReviewClick} className='button--angry'>
                    {intl.formatMessage(messages.deleteReview)}
                  </button>
                )}{' '}
                <button type='button' onClick={() => setReviewModalOpen(true)}>
                  {intl.formatMessage(review == null ? messages.review : messages.editReview)}
                </button>{' '}
                <Help>{intl.formatMessage(messages.reviewHelp, { key: <kbd>Ctrl</kbd> })}</Help>
              </div>
            ) : (
              possibleToReview && (
                <div className='review-button-container'>
                  <Tooltip
                    content={intl.formatMessage(messages.reviewNotLoggedIn, {
                      a: (c: ReactNode) => <a href={loginUrl}>{c}</a>,
                    })}
                  >
                    <button type='button' disabled>
                      {intl.formatMessage(messages.review)}
                    </button>
                  </Tooltip>
                </div>
              )
            )}
            <SubmissionsList
              reviewsAndSubmissions={beatmapset.reviewsAndSubmissions}
              usersById={usersById}
            />
          </td>
        </tr>
      )}
      {canReview && (
        <ReviewEditor
          beatmapset={beatmapset}
          gameMode={gameMode}
          modalState={[reviewModalOpen, setReviewModalOpen]}
          onReviewUpdate={onReviewUpdate}
          review={review}
        />
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
  beatmapset: SubmittedBeatmapset;
}

function PriorityCell({ beatmapset }: PriorityCellProps) {
  const intl = useIntl();

  if (beatmapset.deleted_at != null) {
    return <td className='priority rejected'>{intl.formatMessage(messages.deleted)}</td>;
  }

  if (beatmapset.poll?.in_progress) {
    return (
      <td className='priority'>
        <a href={`https://osu.ppy.sh/community/forums/topics/${beatmapset.poll.topic_id}`}>
          {intl.formatMessage(messages.inVoting)}
        </a>
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

  if (beatmapset.poll?.passed) {
    return (
      <td className='priority'>
        <a href={`https://osu.ppy.sh/community/forums/topics/${beatmapset.poll.topic_id}`}>
          {intl.formatMessage(messages.passedVoting)}
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

  if (beatmapset.poll != null && !beatmapset.poll.passed) {
    return (
      <td className='priority'>
        <a href={`https://osu.ppy.sh/community/forums/topics/${beatmapset.poll.topic_id}`}>
          {intl.formatMessage(messages.failedVoting)}
        </a>
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

  if (beatmapset.maximum_length < 20) {
    return (
      <td className='priority rejected'>
        {intl.formatMessage(messages.notAllowed)}{' '}
        <Help>{intl.formatMessage(messages.notAllowedTooShort)}</Help>
      </td>
    );
  }

  if (beatmapset.low_favorites) {
    return (
      <td className='priority rejected'>
        {intl.formatMessage(messages.notAllowed)}{' '}
        <Help>{intl.formatMessage(messages.notAllowedLowFavorites)}</Help>
      </td>
    );
  }

  if (!beatmapset.reviews.some((review) => review.active_captain)) {
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

interface RatingCellProps {
  beatmapset: SubmittedBeatmapset;
}

function RatingCell({ beatmapset }: RatingCellProps) {
  const intl = useIntl();
  const [, , priorityClass] = priorities.find((p) => beatmapset.review_score_all >= p[0])!;

  return (
    <td className={'priority ' + priorityClass}>
      {intl.formatNumber(beatmapset.review_score_all, {
        maximumFractionDigits: 2,
        signDisplay: 'exceptZero',
      })}
    </td>
  );
}

interface StatusCellProps {
  beatmapset: SubmittedBeatmapset;
}

function StatusCell({ beatmapset }: StatusCellProps) {
  const intl = useIntl();

  // TODO: Support per-mode status for maps loved in only one mode or etc
  if (beatmapset.ranked_status === RankedStatus.loved) {
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

  if (beatmapset.ranked_status === RankedStatus.qualified) {
    return <td className='priority low'>{intl.formatMessage(messages.qualified)}</td>;
  }

  if (beatmapset.ranked_status === RankedStatus.approved) {
    return <td className='priority medium'>{intl.formatMessage(messages.approved)}</td>;
  }

  if (beatmapset.ranked_status === RankedStatus.ranked) {
    return <td className='priority medium'>{intl.formatMessage(messages.ranked)}</td>;
  }

  return (
    <td>
      <Never />
    </td>
  );
}
