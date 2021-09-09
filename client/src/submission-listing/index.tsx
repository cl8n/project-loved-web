import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useReducer } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { Redirect, useHistory, useLocation, useParams } from 'react-router-dom';
import type { GetSubmissionsResponseBody } from '../api';
import { apiErrorMessage, getSubmissions, useApi } from '../api';
import { dateFromString } from '../date-format';
import Help from '../Help';
import type { GameMode, IReview } from '../interfaces';
import {
  gameModeFromShortName,
  gameModeLongName,
  gameModes,
  gameModeShortName,
} from '../osu-helpers';
import { useOsuAuth } from '../osuAuth';
import { isCaptainForMode } from '../permissions';
import type { ToggleableColumn, ToggleableColumnsState } from './helpers';
import { toggleableColumns } from './helpers';
import SortButton from './SortButton';
import SubmissionBeatmapset from './SubmissionBeatmapset';

const messages = defineMessages({
  artist: {
    defaultMessage: 'Artist',
    description: 'Submissions table sort option',
  },
  bpm: {
    defaultMessage: 'BPM',
    description: 'Submissions table header',
  },
  difficultyCount: {
    defaultMessage: 'Diffs',
    description: 'Submissions table header',
  },
  favoriteCount: {
    defaultMessage: 'Favs',
    description: 'Submissions table header',
  },
  gameMode: {
    defaultMessage: 'Game mode:',
    description: 'Selector to change game mode',
  },
  playCount: {
    defaultMessage: 'Plays',
    description: 'Submissions table header',
  },
  priority: {
    defaultMessage: 'Priority',
    description: 'Submissions table header',
  },
  score: {
    defaultMessage: 'Score',
    description: 'Submissions table header',
  },
  scoreHelp: {
    defaultMessage: 'A placeholder method to sort this listing. {definition}',
    description: 'Help text for "Score" submissions table header',
  },
  status: {
    defaultMessage: 'Status',
    description: 'Submissions table header',
  },
  title: {
    defaultMessage: 'Title',
    description: 'Submissions table sort option',
  },
  year: {
    defaultMessage: 'Year',
    description: 'Submissions table header',
  },
});

function columnsReducer(
  prevState: ToggleableColumnsState,
  column: ToggleableColumn,
): ToggleableColumnsState {
  return {
    ...prevState,
    [column]: !prevState[column],
  };
}

type Sort = 'artist' | 'favoriteCount' | 'playCount' | 'priority' | 'score' | 'title' | 'year';
type SortsAndFiltersReducerAction =
  | {
      action: 'changeSort';
      index: 0 | 1;
      sort: Sort;
    }
  | {
      action: 'toggleApproved';
    }
  | {
      action: 'toggleOrder';
      index: 0 | 1;
    };
interface SortsAndFiltersState {
  filterToApproved: boolean;
  sorts: [
    {
      ascending: boolean;
      sort: Sort;
    },
    {
      ascending: boolean;
      sort: Sort;
    },
  ];
}

const allSorts: Sort[] = [
  'artist',
  'title',
  'priority',
  'score',
  'playCount',
  'favoriteCount',
  'year',
];
const defaultAscendingSorts = new Set<Sort>(['artist', 'title', 'year']);
const initialSortsAndFiltersState: SortsAndFiltersState = {
  filterToApproved: false,
  sorts: [
    {
      ascending: false,
      sort: 'priority',
    },
    {
      ascending: false,
      sort: 'score',
    },
  ],
};

function sortsAndFiltersReducer(
  prevState: SortsAndFiltersState,
  action: SortsAndFiltersReducerAction,
): SortsAndFiltersState {
  const state: SortsAndFiltersState = {
    filterToApproved: prevState.filterToApproved,
    sorts: [{ ...prevState.sorts[0] }, { ...prevState.sorts[1] }],
  };

  switch (action.action) {
    case 'changeSort':
      state.sorts[action.index] = {
        ascending: defaultAscendingSorts.has(action.sort),
        sort: action.sort,
      };

      if (action.index === 0) {
        const secondSort = action.sort === 'score' ? 'priority' : 'score';

        state.sorts[1] = {
          ascending: defaultAscendingSorts.has(secondSort),
          sort: secondSort,
        };
      }

      break;
    case 'toggleApproved':
      state.filterToApproved = !prevState.filterToApproved;
      break;
    case 'toggleOrder':
      state.sorts[action.index].ascending = !prevState.sorts[action.index].ascending;
      break;
  }

  return state;
}

export default function SubmissionListingContainer() {
  const history = useHistory();
  const intl = useIntl();
  const params = useParams<{ gameMode: string | undefined }>();
  const [columns, toggleColumn] = useReducer(columnsReducer, {
    bpm: true,
    difficultyCount: true,
    favoriteCount: true,
    playCount: true,
    score: true,
    year: true,
  });
  const [sortsAndFilters, updateSortOrFilter] = useReducer(
    sortsAndFiltersReducer,
    initialSortsAndFiltersState,
  );
  const sortOptions = useMemo(
    () => [allSorts, allSorts.filter((sort) => sort !== sortsAndFilters.sorts[0].sort)] as const,
    [sortsAndFilters],
  );

  const gameMode = params.gameMode == null ? null : gameModeFromShortName(params.gameMode);

  if (gameMode == null) {
    return <Redirect to='/submissions/osu' />;
  }

  const onGameModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newMode = parseInt(event.currentTarget.value);

    if (newMode !== gameMode) {
      history.push(`/submissions/${gameModeShortName(newMode)}`);
    }
  };

  // TODO: Controls break on languages with longer column names (fi, sv)
  return (
    <>
      <FormattedMessage
        defaultMessage='Submitted maps'
        description='Submissions table title'
        tagName='h1'
      />
      <div className='warning-box'>
        <FormattedMessage
          defaultMessage='
            This listing only includes submissions sent from this website. Entries from the old
            Google sheets will be moved here soon, and then the Google sheets will be retired.
          '
          description='Warning box above submissions table'
        />
      </div>
      <div className='flex-left'>
        <label htmlFor='gameMode'>{intl.formatMessage(messages.gameMode)}</label>
        <select name='gameMode' value={gameMode} onChange={onGameModeChange}>
          {gameModes.map((m) => (
            <option key={m} value={m}>
              {gameModeLongName(m)}
            </option>
          ))}
        </select>
        <FormattedMessage
          defaultMessage='Columns:'
          description='Title for options to show or hide columns'
          tagName='span'
        />
        <span className='flex-text'>
          {toggleableColumns.map((column) => (
            <button
              key={column}
              type='button'
              className={`fake-a${columns[column] ? ' underline' : ''}`}
              onClick={() => toggleColumn(column)}
            >
              {intl.formatMessage(messages[column])}
            </button>
          ))}
        </span>
        <FormattedMessage
          defaultMessage='Sort by:'
          description='Title for sorting options'
          tagName='span'
        />
        {sortsAndFilters.sorts.map((sort, sortIndex) => (
          <span key={sortIndex}>
            <select
              value={sort.sort}
              onChange={(event) =>
                updateSortOrFilter({
                  action: 'changeSort',
                  index: sortIndex as 0 | 1,
                  sort: event.currentTarget.value as Sort,
                })
              }
            >
              {sortOptions[sortIndex].map((sortOption) => (
                <option key={sortOption} value={sortOption}>
                  {intl.formatMessage(
                    messages[
                      sortsAndFilters.filterToApproved && sortOption === 'priority'
                        ? 'status'
                        : sortOption
                    ],
                  )}
                </option>
              ))}
            </select>{' '}
            <SortButton
              ascending={sort.ascending}
              toggle={() =>
                updateSortOrFilter({ action: 'toggleOrder', index: sortIndex as 0 | 1 })
              }
            />
          </span>
        ))}
        <button
          type='button'
          className='push-right'
          onClick={() => updateSortOrFilter({ action: 'toggleApproved' })}
        >
          {sortsAndFilters.filterToApproved ? 'Show pending' : 'Show approved'}
        </button>
      </div>
      <SubmissionListing columns={columns} gameMode={gameMode} sortsAndFilters={sortsAndFilters} />
    </>
  );
}

function compareOrFallback<T>(a: T, b: T, hasProperty: (item: T) => boolean): number | null {
  const aHasProperty = hasProperty(a);
  return +aHasProperty - +hasProperty(b) || (aHasProperty ? 0 : null);
}

type _Beatmapset = GetSubmissionsResponseBody['beatmapsets'][number];
const beatmapsetSortFns: Record<Sort | 'status', (a: _Beatmapset, b: _Beatmapset) => number> = {
  artist: (a, b) => a.artist.toLowerCase().localeCompare(b.artist.toLowerCase()),
  favoriteCount: (a, b) => a.favorite_count - b.favorite_count,
  playCount: (a, b) => a.play_count - b.play_count,
  priority: (a, b) =>
    compareOrFallback(a, b, (beatmapset) => beatmapset.nominated) ??
    compareOrFallback(
      b,
      a,
      (beatmapset) => beatmapset.strictly_rejected || beatmapset.consent === false,
    ) ??
    compareOrFallback(b, a, (beatmapset) => beatmapset.poll != null && !beatmapset.poll.passed) ??
    compareOrFallback(b, a, (beatmapset) => beatmapset.reviews.length === 0) ??
    a.review_score - b.review_score,
  score: (a, b) => a.score - b.score,
  status: (a, b) => +(a.ranked_status === 4) - +(b.ranked_status === 4),
  title: (a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
  year: (a, b) =>
    dateFromString(a.submitted_at).getFullYear() - dateFromString(b.submitted_at).getFullYear(),
};

function beatmapsetSortFn(
  { ascending, sort }: SortsAndFiltersState['sorts'][number],
  filterToApproved: boolean,
): (a: _Beatmapset, b: _Beatmapset) => number {
  return (a, b) =>
    (ascending ? 1 : -1) *
    beatmapsetSortFns[filterToApproved && sort === 'priority' ? 'status' : sort](a, b);
}

interface SubmissionListingProps {
  columns: ToggleableColumnsState;
  gameMode: GameMode;
  sortsAndFilters: SortsAndFiltersState;
}

function SubmissionListing({ columns, gameMode, sortsAndFilters }: SubmissionListingProps) {
  const history = useHistory();
  const intl = useIntl();
  const { pathname: locationPath, state: submittedBeatmapsetId } = useLocation<
    number | undefined
  >();
  const authUser = useOsuAuth().user;
  const [submissionsInfo, submissionsInfoError, setSubmissionsInfo] = useApi(getSubmissions, [
    gameMode,
  ]);
  const displayBeatmapsets = useMemo(() => {
    if (submissionsInfo == null) {
      return null;
    }

    // Beatmapsets come from API sorted by score descending
    return submissionsInfo.beatmapsets
      .filter((beatmapset) =>
        sortsAndFilters.filterToApproved
          ? beatmapset.ranked_status > 0
          : beatmapset.ranked_status <= 0,
      )
      .sort(beatmapsetSortFn(sortsAndFilters.sorts[1], sortsAndFilters.filterToApproved))
      .sort(beatmapsetSortFn(sortsAndFilters.sorts[0], sortsAndFilters.filterToApproved))
      .sort((a, b) => +b.poll_in_progress - +a.poll_in_progress);
  }, [sortsAndFilters, submissionsInfo]);

  useEffect(() => {
    if (submissionsInfo == null || submittedBeatmapsetId == null) {
      return;
    }

    document.querySelector(`[data-beatmapset-id="${submittedBeatmapsetId}"]`)?.scrollIntoView();
    history.replace(locationPath);
  }, [history, locationPath, submissionsInfo, submittedBeatmapsetId]);

  if (submissionsInfoError != null) {
    return (
      <span className='panic'>
        Failed to load submissions: {apiErrorMessage(submissionsInfoError)}
      </span>
    );
  }

  if (submissionsInfo == null || displayBeatmapsets == null) {
    return <span>Loading submissions...</span>;
  }

  if (displayBeatmapsets.length === 0) {
    return (
      <p>
        <b>No submissions to show!</b>
      </p>
    );
  }

  const canReview = authUser != null && isCaptainForMode(authUser, gameMode);
  const onReviewUpdate = (review: IReview) => {
    setSubmissionsInfo((prev) => {
      const beatmapset = prev!.beatmapsets.find(
        (beatmapset) => beatmapset.id === review.beatmapset_id,
      )!;
      const existingReview = beatmapset.reviews.find((existing) => existing.id === review.id);

      if (existingReview != null) {
        beatmapset.review_score -= existingReview.score;
        Object.assign(existingReview, review);
      } else {
        beatmapset.reviews.push(review);
      }

      if (review.score >= -3) {
        beatmapset.review_score += review.score;
      }

      beatmapset.strictly_rejected = beatmapset.reviews.some((review) => review.score < -3);

      if (prev!.usersById[review.captain_id] == null) {
        prev!.usersById[review.captain_id] = { ...authUser!, alumni: authUser!.roles.alumni };
      }

      return {
        beatmapsets: [...prev!.beatmapsets],
        usersById: { ...prev!.usersById },
      };
    });
  };

  return (
    <table className='main-table submissions-table'>
      <thead>
        <tr className='sticky'>
          <FormattedMessage
            defaultMessage='Beatmapset'
            description='Submissions table header'
            tagName='th'
          />
          <FormattedMessage
            defaultMessage='Mapper'
            description='Submissions table header'
            tagName='th'
          />
          <th>
            {sortsAndFilters.filterToApproved
              ? intl.formatMessage(messages.status)
              : intl.formatMessage(messages.priority)}
          </th>
          {columns.score && (
            <th>
              {intl.formatMessage(messages.score)}{' '}
              <Help>
                {intl.formatMessage(messages.scoreHelp, {
                  definition: `${intl.formatMessage(messages.score)} = ${intl.formatMessage(
                    messages.favoriteCount,
                  )} × 75 + ${intl.formatMessage(messages.playCount)}`,
                })}
              </Help>
            </th>
          )}
          {columns.playCount && <th>{intl.formatMessage(messages.playCount)}</th>}
          {columns.favoriteCount && <th>{intl.formatMessage(messages.favoriteCount)}</th>}
          {columns.year && <th>{intl.formatMessage(messages.year)}</th>}
          {columns.difficultyCount && <th>{intl.formatMessage(messages.difficultyCount)}</th>}
          {columns.bpm && <th>{intl.formatMessage(messages.bpm)}</th>}
          <th />
        </tr>
      </thead>
      <tbody>
        {displayBeatmapsets.map((beatmapset) => (
          <SubmissionBeatmapset
            key={beatmapset.id}
            beatmapset={beatmapset}
            canReview={canReview && !sortsAndFilters.filterToApproved}
            columns={columns}
            filterToApproved={sortsAndFilters.filterToApproved}
            gameMode={gameMode}
            onReviewUpdate={onReviewUpdate}
            review={
              canReview
                ? beatmapset.reviews.find((review) => review.captain_id === authUser!.id)
                : undefined
            }
            usersById={submissionsInfo.usersById}
          />
        ))}
      </tbody>
    </table>
  );
}
