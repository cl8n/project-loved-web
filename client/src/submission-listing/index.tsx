import {
  GameMode,
  gameModeFromShortName,
  gameModeLongName,
  gameModes,
  gameModeShortName,
} from 'loved-bridge/beatmaps/gameMode';
import { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import {
  beatmapCaptainPriority,
  beatmapRating,
  containsNotAllowed,
} from 'loved-bridge/beatmaps/reviews';
import type { ChangeEvent, Dispatch } from 'react';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { GetSubmissionsResponseBody } from '../api';
import { apiErrorMessage, getSubmissions, useApi } from '../api';
import { dateFromString } from '../date-format';
import Help from '../Help';
import type { IReview } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import PageSelector from '../PageSelector';
import useTitle from '../useTitle';
import type { ToggleableColumn, ToggleableColumnsState } from './helpers';
import { beatmapsetNotAllowed, combineReviewsAndSubmissions, toggleableColumns } from './helpers';
import type { SubmittedBeatmapset } from './interfaces';
import type { Comparison, Search } from './SearchInput';
import SearchInput from './SearchInput';
import SortButton from './SortButton';
import SubmissionBeatmapset from './SubmissionBeatmapset';

const messages = defineMessages({
  any: {
    defaultMessage: 'Any',
    description: '[General] Selector option indicating that any of the choices are valid',
  },
  artist: {
    defaultMessage: 'Artist',
    description: '[Submissions] Submissions table sort option',
  },
  bpm: {
    defaultMessage: 'BPM',
    description: '[Submissions] Submissions table header',
  },
  difficultyCount: {
    defaultMessage: 'Diffs',
    description: '[Submissions] Submissions table header',
  },
  earliestReview: {
    defaultMessage: 'Earliest review',
    description: '[Submissions] Submissions table sort option',
  },
  favoriteCount: {
    defaultMessage: 'Favs',
    description: '[Submissions] Submissions table header',
  },
  gameMode: {
    defaultMessage: 'Game mode:',
    description: '[General] Selector to change game mode',
  },
  keyModes: {
    defaultMessage: 'Keys',
    description: '[Submissions] Submissions table header',
  },
  latestReview: {
    defaultMessage: 'Latest review',
    description: '[Submissions] Submissions table sort option',
  },
  lovedAndRanked: {
    defaultMessage: 'Loved and ranked',
    description: '[Submissions] Beatmap status option',
  },
  notReviewed: {
    defaultMessage: 'Not reviewed',
    description: '[Submissions] Review status option',
  },
  pendingAndGrave: {
    defaultMessage: 'Pending and grave',
    description: '[Submissions] Beatmap status option',
  },
  playCount: {
    defaultMessage: 'Plays',
    description: '[Submissions] Submissions table header',
  },
  priority: {
    defaultMessage: 'Priority',
    description: '[Submissions] Submissions table header',
  },
  rating: {
    defaultMessage: 'Rating',
    description: '[Submissions] Submissions table header',
  },
  reviewed: {
    defaultMessage: 'Reviewed',
    description: '[Submissions] Review status option',
  },
  score: {
    defaultMessage: 'Score',
    description: '[Submissions] Submissions table header',
  },
  scoreHelp: {
    defaultMessage: 'A placeholder method to sort this listing. {definition}',
    description: '[Submissions] Help text for "Score" submissions table header',
  },
  status: {
    defaultMessage: 'Status',
    description: '[Submissions] Submissions table header',
  },
  title: {
    defaultMessage: 'Title',
    description: '[Submissions] Submissions table sort option',
  },
  year: {
    defaultMessage: 'Year',
    description: '[Submissions] Submissions table header',
  },
  commonKeyModes: {
    defaultMessage: 'Common',
    description: '[Submissions] osu!mania key mode option group for common key modes',
  },
  uncommonKeyModes: {
    defaultMessage: 'Uncommon',
    description: '[Submissions] osu!mania key mode option group for uncommon key modes',
  },
});

const allBeatmapStatuses = ['pendingAndGrave', 'lovedAndRanked'] as const;
type BeatmapStatus = (typeof allBeatmapStatuses)[number];

const allReviewStatuses = ['any', 'reviewed', 'notReviewed'] as const;
type ReviewStatus = (typeof allReviewStatuses)[number];

const allSorts = [
  'artist',
  'title',
  'priority',
  'rating',
  'score',
  'playCount',
  'favoriteCount',
  'year',
  'latestReview',
  'earliestReview',
] as const;
type Sort = (typeof allSorts)[number];

function getNewSubmissionsListingPath(gameMode: GameMode, keyMode?: number | undefined): string {
  let path = `/submissions/${gameModeShortName(gameMode)}`;

  if (keyMode != null) {
    path += `/${keyMode}K`;
  }

  return path;
}

function columnsReducer(
  prevState: ToggleableColumnsState,
  column: ToggleableColumn,
): ToggleableColumnsState {
  return {
    ...prevState,
    [column]: !prevState[column],
  };
}

type SortsReducerAction =
  | {
      action: 'changeSort';
      index: 0 | 1;
      sort: Sort;
    }
  | {
      action: 'toggleOrder';
      index: 0 | 1;
    };
type SortsState = [
  {
    ascending: boolean;
    sort: Sort;
  },
  {
    ascending: boolean;
    sort: Sort;
  },
];

const defaultAscendingSorts = new Set<Sort>(['artist', 'title', 'year']);
const alwaysAscendingSorts = new Set<Sort>(['latestReview', 'earliestReview']);
const initialSortsState: SortsState = [
  {
    ascending: false,
    sort: 'priority',
  },
  {
    ascending: false,
    sort: 'score',
  },
];

function sortsReducer(prevSorts: SortsState, action: SortsReducerAction): SortsState {
  const sorts: SortsState = [{ ...prevSorts[0] }, { ...prevSorts[1] }];

  switch (action.action) {
    case 'changeSort':
      sorts[action.index] = {
        ascending: defaultAscendingSorts.has(action.sort),
        sort: action.sort,
      };

      if (action.index === 0) {
        const secondSort = action.sort === 'score' ? 'priority' : 'score';

        sorts[1] = {
          ascending: defaultAscendingSorts.has(secondSort),
          sort: secondSort,
        };
      }

      break;
    case 'toggleOrder':
      sorts[action.index].ascending = !sorts[action.index].ascending;
      break;
  }

  return sorts;
}

type SubmissionListingParams =
  | { gameMode: string | undefined; keyMode: never }
  | { gameMode: never; keyMode: string };

export default function SubmissionListingContainer() {
  const authUser = useOsuAuth().user;
  const intl = useIntl();
  const navigate = useNavigate();
  const params = useParams<SubmissionListingParams>();
  const [beatmapStatus, setBeatmapStatus] = useState<BeatmapStatus>('pendingAndGrave');
  const [columns, toggleColumn] = useReducer(columnsReducer, {
    bpm: true,
    difficultyCount: true,
    favoriteCount: true,
    keyModes: true,
    playCount: true,
    rating: true,
    score: true,
    year: true,
  });
  const [page, setPage] = useState(1);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('any');
  const [search, setSearch] = useState<Search>({ comparisons: [], rawSearch: '' });
  const [sorts, updateSort] = useReducer(sortsReducer, initialSortsState);
  const sortOptions = useMemo(
    () => [allSorts, allSorts.filter((sort) => sort !== sorts[0].sort)] as const,
    [sorts],
  );

  const [gameMode, keyMode, redirectGameMode] =
    params.keyMode != null
      ? // The game mode is osu!mania. If the key mode is in a valid format,
        // set it, and otherwise redirect to osu!mania without a key mode
        /^\d+K$/.test(params.keyMode)
        ? [GameMode.mania, parseInt(params.keyMode, 10)]
        : [undefined, undefined, GameMode.mania]
      : // The game mode is not osu!mania, so parse it and leave key mode unset
        [gameModeFromShortName(params.gameMode?.toLowerCase())];

  useTitle(
    gameMode == null
      ? null
      : `${keyMode == null ? '' : `${keyMode}K `}${gameModeLongName(gameMode)} submissions`,
  );

  if (gameMode == null) {
    return (
      <Navigate
        replace
        to={getNewSubmissionsListingPath(
          redirectGameMode ??
            gameModeFromShortName(localStorage.getItem('gameMode')) ??
            GameMode.osu,
        )}
      />
    );
  }

  const onGameModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newGameMode = parseInt(event.currentTarget.value, 10);

    if (newGameMode !== gameMode) {
      localStorage.setItem('gameMode', gameModeShortName(newGameMode));
      navigate(getNewSubmissionsListingPath(newGameMode));
      setPage(1);
    }
  };
  const onKeyModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newKeyMode = event.currentTarget.value
      ? parseInt(event.currentTarget.value, 10)
      : undefined;

    if (newKeyMode !== keyMode) {
      navigate(getNewSubmissionsListingPath(GameMode.mania, newKeyMode));
      setPage(1);
    }
  };

  // TODO: Controls break on languages with longer column names (fi, sv)
  return (
    <>
      <FormattedMessage
        defaultMessage='Submitted maps'
        description='[Submissions] Submissions table title'
        tagName='h1'
      />
      <div className='block-margin submissions-controls'>
        <div className='flex-center'>
          <label htmlFor='gameMode'>{intl.formatMessage(messages.gameMode)}</label>
          <select name='gameMode' value={gameMode} onChange={onGameModeChange}>
            {gameModes.map((m) => (
              <option key={m} value={m}>
                {gameModeLongName(m)}
              </option>
            ))}
          </select>
          {gameMode === GameMode.mania && (
            <>
              <FormattedMessage
                defaultMessage='Key mode:'
                description='[Submissions] Selector to change osu!mania key mode'
                tagName='span'
              />
              <select value={keyMode} onChange={onKeyModeChange}>
                <option value=''>{intl.formatMessage(messages.any)}</option>
                <optgroup label={intl.formatMessage(messages.commonKeyModes)}>
                  {[4, 7].map((keyMode) => (
                    <option key={keyMode} value={keyMode}>
                      {keyMode}K
                    </option>
                  ))}
                </optgroup>
                <optgroup label={intl.formatMessage(messages.uncommonKeyModes)}>
                  {[1, 2, 3, 5, 6, 8, 9, 10, 12, 14, 16, 18].map((keyMode) => (
                    <option key={keyMode} value={keyMode}>
                      {keyMode}K
                    </option>
                  ))}
                </optgroup>
              </select>
            </>
          )}
          <FormattedMessage
            defaultMessage='Beatmap status:'
            description='[Submissions] Selector to change beatmap status'
            tagName='span'
          />
          <select
            value={beatmapStatus}
            onChange={(event) => {
              setBeatmapStatus(event.currentTarget.value as BeatmapStatus);
              setPage(1);
            }}
          >
            {allBeatmapStatuses.map((status) => (
              <option key={status} value={status}>
                {intl.formatMessage(messages[status])}
              </option>
            ))}
          </select>
          {authUser != null && (
            <>
              <FormattedMessage
                defaultMessage='My review status:'
                description='[Submissions] Selector to change own review status filter'
                tagName='span'
              />
              <select
                value={reviewStatus}
                onChange={(event) => {
                  setReviewStatus(event.currentTarget.value as ReviewStatus);
                  setPage(1);
                }}
              >
                {allReviewStatuses.map((status) => (
                  <option key={status} value={status}>
                    {intl.formatMessage(messages[status])}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className='flex-left slim-margin'>
          <span>
            <FormattedMessage
              defaultMessage='Search:'
              description='[Submissions] Title for submissions search input'
            />{' '}
            <Help>
              <FormattedMessage
                defaultMessage='Typing into this field will search by title, artist, and creator.'
                description='[Submissions] Help text for the "Search" field (basic use)'
                tagName='p'
              />
              <FormattedMessage
                defaultMessage='Comparisons may be included to match against more properties. For example, {comparison} will filter to maps with more than 100 favorites.'
                description='[Submissions] Help text for the "Search" field (intro to comparisons)'
                tagName='p'
                values={{
                  comparison: (
                    <>
                      <span className='search-input search-input--operand-1'>favorites</span>
                      <span className='search-input search-input--operator'>{'>'}</span>
                      <span className='search-input search-input--operand-2'>100</span>
                    </>
                  ),
                }}
              />
              <table className='submissions-search-help-table'>
                <tbody>
                  <tr>
                    <FormattedMessage
                      defaultMessage='Available properties:'
                      description='[Submissions] Help text for the "Search" field (properties)'
                      tagName='td'
                    />
                    <td>
                      <div className='flex-left flex-wrap'>
                        <span className='search-input search-input--operand-1'>artist</span>
                        <span className='search-input search-input--operand-1'>bpm</span>
                        <span className='search-input search-input--operand-1'>creator</span>
                        <span className='search-input search-input--operand-1'>difficulties</span>
                        <span className='search-input search-input--operand-1'>diffs</span>
                        <span className='search-input search-input--operand-1'>favorites</span>
                        <span className='search-input search-input--operand-1'>favs</span>
                        <span className='search-input search-input--operand-1'>length</span>
                        <span className='search-input search-input--operand-1'>mapper</span>
                        <span className='search-input search-input--operand-1'>playcount</span>
                        <span className='search-input search-input--operand-1'>plays</span>
                        <span className='search-input search-input--operand-1'>priority</span>
                        <span className='search-input search-input--operand-1'>rating</span>
                        <span className='search-input search-input--operand-1'>score</span>
                        <span className='search-input search-input--operand-1'>submitted</span>
                        <span className='search-input search-input--operand-1'>title</span>
                        <span className='search-input search-input--operand-1'>updated</span>
                        <span className='search-input search-input--operand-1'>year</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <FormattedMessage
                      defaultMessage='Available operators:'
                      description='[Submissions] Help text for the "Search" field (operators)'
                      tagName='td'
                    />
                    <td>
                      <div className='flex-left flex-wrap'>
                        <span className='search-input search-input--operator'>{'='}</span>
                        <span className='search-input search-input--operator'>{'=='}</span>
                        <span className='search-input search-input--operator'>{':'}</span>
                        <span className='search-input search-input--operator'>{'!='}</span>
                        <span className='search-input search-input--operator'>{'!:'}</span>
                        <span className='search-input search-input--operator'>{'<>'}</span>
                        <span className='search-input search-input--operator'>{'<'}</span>
                        <span className='search-input search-input--operator'>{'<='}</span>
                        <span className='search-input search-input--operator'>{'>'}</span>
                        <span className='search-input search-input--operator'>{'>='}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Help>
          </span>
          <SearchInput
            search={search}
            setSearch={(search) => {
              setSearch(search);
              setPage(1);
            }}
          />
        </div>
        <div className='flex-center slim-margin'>
          <FormattedMessage
            defaultMessage='Columns:'
            description='[Submissions] Title for options to show or hide columns'
            tagName='span'
          />
          <span className='flex-text'>
            {toggleableColumns.map(
              (column) =>
                (gameMode === GameMode.mania || column !== 'keyModes') && (
                  <button
                    key={column}
                    type='button'
                    className={`fake-a${columns[column] ? ' underline' : ''}`}
                    onClick={() => toggleColumn(column)}
                  >
                    {intl.formatMessage(messages[column])}
                  </button>
                ),
            )}
          </span>
          <FormattedMessage
            defaultMessage='Sort by:'
            description='[Submissions] Title for sorting options'
            tagName='span'
          />
          {sorts.map((sort, sortIndex) => (
            <span key={sortIndex}>
              <select
                value={sort.sort}
                onChange={(event) => {
                  updateSort({
                    action: 'changeSort',
                    index: sortIndex as 0 | 1,
                    sort: event.currentTarget.value as Sort,
                  });
                  setPage(1);
                }}
              >
                {sortOptions[sortIndex].map((sortOption) => (
                  <option key={sortOption} value={sortOption}>
                    {intl.formatMessage(
                      messages[
                        beatmapStatus === 'lovedAndRanked' && sortOption === 'priority'
                          ? 'status'
                          : sortOption
                      ],
                    )}
                  </option>
                ))}
              </select>{' '}
              <SortButton
                ascending={sort.ascending}
                hidden={alwaysAscendingSorts.has(sort.sort)}
                toggle={() => {
                  updateSort({ action: 'toggleOrder', index: sortIndex as 0 | 1 });
                  setPage(1);
                }}
              />
            </span>
          ))}
        </div>
      </div>
      <SubmissionListing
        beatmapStatus={beatmapStatus}
        columns={columns}
        gameMode={gameMode}
        keyMode={keyMode}
        page={page}
        reviewStatus={reviewStatus}
        search={search}
        setPage={setPage}
        sorts={sorts}
      />
    </>
  );
}

function getReviewTimes({ reviews, submissions }: SubmittedBeatmapset): number[] {
  return [...reviews, ...submissions.filter((submission) => submission.submitted_at != null)].map(
    (rOrS) =>
      dateFromString('submitted_at' in rOrS ? rOrS.submitted_at! : rOrS.reviewed_at).getTime(),
  );
}

function compareOrFallback<T>(a: T, b: T, hasProperty: (item: T) => boolean): number | null {
  const aHasProperty = hasProperty(a);
  return +aHasProperty - +hasProperty(b) || (aHasProperty ? 0 : null);
}

const beatmapsetSortFns: Record<
  Sort | 'status',
  (a: SubmittedBeatmapset, b: SubmittedBeatmapset) => number
> = {
  artist: (a, b) => a.artist.toLowerCase().localeCompare(b.artist.toLowerCase()),
  earliestReview: (a, b) => Math.min(...getReviewTimes(a)) - Math.min(...getReviewTimes(b)),
  favoriteCount: (a, b) => a.favorite_count - b.favorite_count,
  latestReview: (a, b) => Math.max(...getReviewTimes(b)) - Math.max(...getReviewTimes(a)),
  playCount: (a, b) => a.play_count - b.play_count,
  priority: (a, b) =>
    compareOrFallback(a, b, (set) => set.nominated_round_name != null) ??
    compareOrFallback(b, a, beatmapsetNotAllowed) ??
    compareOrFallback(b, a, (set) => set.poll != null && !set.poll.passed) ??
    compareOrFallback(b, a, (set) => !set.reviews.some((review) => review.active_captain)) ??
    a.review_score - b.review_score,
  rating: (a, b) => a.review_score_all - b.review_score_all,
  score: (a, b) => a.score - b.score,
  status: (a, b) =>
    +(a.ranked_status === RankedStatus.loved) - +(b.ranked_status === RankedStatus.loved),
  title: (a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
  year: (a, b) =>
    dateFromString(a.submitted_at).getFullYear() - dateFromString(b.submitted_at).getFullYear(),
};

function beatmapsetSortFn(
  { ascending, sort }: SortsState[number],
  beatmapStatus: BeatmapStatus,
): (a: SubmittedBeatmapset, b: SubmittedBeatmapset) => number {
  return (a, b) =>
    (ascending || alwaysAscendingSorts.has(sort) ? 1 : -1) *
    beatmapsetSortFns[beatmapStatus === 'lovedAndRanked' && sort === 'priority' ? 'status' : sort](
      a,
      b,
    );
}

function matchesSearch(
  beatmapset: GetSubmissionsResponseBody['beatmapsets'][number],
  gameMode: GameMode,
  search: Search,
): boolean {
  if (
    search.textSearch != null &&
    !beatmapset.artist.toLowerCase().includes(search.textSearch) &&
    !beatmapset.creator_name.toLowerCase().includes(search.textSearch) &&
    !beatmapset.title.toLowerCase().includes(search.textSearch)
  ) {
    return false;
  }

  if (search.comparisons.length > 0) {
    const comparisonLhsMap = {
      artist: beatmapset.artist.toLowerCase(),
      beatmap_count: beatmapset.beatmap_counts[gameMode],
      bpm: beatmapset.modal_bpm,
      creator_name: beatmapset.creator_name.toLowerCase(),
      favorites: beatmapset.favorite_count,
      length: beatmapset.maximum_length,
      plays: beatmapset.play_count,
      priority: beatmapset.review_score,
      rating: beatmapset.review_score_all,
      score: beatmapset.score,
      title: beatmapset.title.toLowerCase(),
      submitted_at: dateFromString(beatmapset.submitted_at).getFullYear(),
      updated_at: dateFromString(beatmapset.updated_at).getFullYear(),
    };

    return search.comparisons.every((c) => satisfiesComparison(c, comparisonLhsMap[c.lhs]));
  }

  return true;
}

function satisfiesComparison(comparison: Comparison, lhs: number | string): boolean {
  const { operator, rhs } = comparison;

  if (typeof lhs === 'number' && typeof rhs === 'number') {
    const roundedLhs = Math.round(lhs * 100) / 100;
    const roundedRhs = Math.round(rhs * 100) / 100;

    switch (operator) {
      case '=':
        return roundedLhs === roundedRhs;
      case '!=':
        return roundedLhs !== roundedRhs;
      case '<':
        return roundedLhs < roundedRhs;
      case '<=':
        return roundedLhs <= roundedRhs;
      case '>':
        return roundedLhs > roundedRhs;
      case '>=':
        return roundedLhs >= roundedRhs;
    }
  }

  if (typeof lhs === 'string' && typeof rhs === 'string') {
    const result = lhs.includes(rhs);
    return operator === '=' ? result : !result;
  }

  return false;
}

function sortReviews(a: IReview, b: IReview): number {
  return (
    +(b.score < -3) - +(a.score < -3) ||
    +(b.active_captain ?? -1) - +(a.active_captain ?? -1) ||
    dateFromString(a.reviewed_at).getTime() - dateFromString(b.reviewed_at).getTime()
  );
}

const pageSize = 30;

interface SubmissionListingProps {
  beatmapStatus: BeatmapStatus;
  columns: ToggleableColumnsState;
  gameMode: GameMode;
  keyMode: number | undefined;
  page: number;
  reviewStatus: ReviewStatus;
  search: Search;
  setPage: Dispatch<number>;
  sorts: SortsState;
}

function SubmissionListing({
  beatmapStatus,
  columns,
  gameMode,
  keyMode,
  page,
  reviewStatus,
  search,
  setPage,
  sorts,
}: SubmissionListingProps) {
  const intl = useIntl();
  const { state: submittedBeatmapsetId } = useLocation() as { state: unknown };
  const navigate = useNavigate();
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
      .filter(
        (beatmapset) =>
          (keyMode == null || beatmapset.key_modes.includes(keyMode)) &&
          (beatmapStatus === 'lovedAndRanked'
            ? beatmapset.ranked_status > RankedStatus.pending
            : beatmapset.ranked_status <= RankedStatus.pending) &&
          matchesSearch(beatmapset, gameMode, search) &&
          (authUser == null ||
            reviewStatus === 'any' ||
            (reviewStatus === 'reviewed') ===
              beatmapset.reviews.some((review) => review.reviewer_id === authUser.id)),
      )
      .map((beatmapset) => ({
        ...beatmapset,
        creator: submissionsInfo.usersById[beatmapset.creator_id],
        reviewsAndSubmissions: combineReviewsAndSubmissions(
          beatmapset.reviews,
          beatmapset.submissions,
        ),
      }))
      .sort(beatmapsetSortFn(sorts[1], beatmapStatus))
      .sort(beatmapsetSortFn(sorts[0], beatmapStatus))
      .sort((a, b) => +(b.poll?.in_progress ?? false) - +(a.poll?.in_progress ?? false))
      .sort((a, b) => +(a.deleted_at != null) - +(b.deleted_at != null));
  }, [authUser, beatmapStatus, gameMode, keyMode, reviewStatus, search, sorts, submissionsInfo]);

  useEffect(() => {
    if (displayBeatmapsets == null || typeof submittedBeatmapsetId !== 'number') {
      return;
    }

    const submittedBeatmapsetIndex = displayBeatmapsets.findIndex(
      (beatmapset) => beatmapset.id === submittedBeatmapsetId,
    );

    if (submittedBeatmapsetIndex < 0) {
      navigate({}, { replace: true });
      return;
    }

    const submittedBeatmapsetPage = Math.floor(submittedBeatmapsetIndex / pageSize) + 1;

    if (page !== submittedBeatmapsetPage) {
      setPage(submittedBeatmapsetPage);
      return;
    }

    document.querySelector(`[data-beatmapset-id="${submittedBeatmapsetId}"]`)?.scrollIntoView();
    navigate({}, { replace: true });
  }, [displayBeatmapsets, navigate, page, setPage, submittedBeatmapsetId]);

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

  if (displayBeatmapsets.length === 0 && page === 1) {
    return (
      <p>
        <b>No submissions to show!</b>
      </p>
    );
  }

  const pageCount = Math.ceil(displayBeatmapsets.length / pageSize);

  if (page < 1 || page > pageCount) {
    setPage(1);
    return null;
  }

  const onReviewDelete = (deletedReview: IReview) => {
    setSubmissionsInfo((prev) => {
      const beatmapset = prev!.beatmapsets.find(
        (beatmapset) => beatmapset.id === deletedReview.beatmapset_id,
      )!;

      beatmapset.reviews = beatmapset.reviews
        .filter((review) => review.id !== deletedReview.id)
        .sort(sortReviews);
      beatmapset.review_score = beatmapCaptainPriority(beatmapset.reviews);
      beatmapset.review_score_all = beatmapRating(beatmapset.reviews);
      beatmapset.strictly_rejected = containsNotAllowed(beatmapset.reviews);

      return {
        beatmapsets: [...prev!.beatmapsets],
        usersById: prev!.usersById,
      };
    });
    navigate({}, { replace: true, state: deletedReview.beatmapset_id });
  };
  const onReviewUpdate = (review: IReview) => {
    setSubmissionsInfo((prev) => {
      const beatmapset = prev!.beatmapsets.find(
        (beatmapset) => beatmapset.id === review.beatmapset_id,
      )!;
      const existingReview = beatmapset.reviews.find((existing) => existing.id === review.id);

      if (existingReview != null) {
        Object.assign(existingReview, review);
      } else {
        beatmapset.reviews.push(review);
      }

      beatmapset.reviews.sort(sortReviews);
      beatmapset.review_score = beatmapCaptainPriority(beatmapset.reviews);
      beatmapset.review_score_all = beatmapRating(beatmapset.reviews);
      beatmapset.strictly_rejected = containsNotAllowed(beatmapset.reviews);

      if (prev!.usersById[review.reviewer_id] == null) {
        prev!.usersById[review.reviewer_id] = { ...authUser! };
      }

      return {
        beatmapsets: [...prev!.beatmapsets],
        usersById: { ...prev!.usersById },
      };
    });
    navigate({}, { replace: true, state: review.beatmapset_id });
  };

  return (
    <>
      <PageSelector page={page} pageCount={pageCount} setPage={setPage} />
      <table className='main-table submissions-table'>
        <thead>
          <tr className='sticky'>
            <th />
            {gameMode === GameMode.mania && columns.keyModes && (
              <th>{intl.formatMessage(messages.keyModes)}</th>
            )}
            <FormattedMessage
              defaultMessage='Beatmapset'
              description='[Submissions] Submissions table header'
              tagName='th'
            />
            <FormattedMessage
              defaultMessage='Mapper'
              description='[Submissions] Submissions table header'
              tagName='th'
            />
            <th>
              {beatmapStatus === 'lovedAndRanked'
                ? intl.formatMessage(messages.status)
                : intl.formatMessage(messages.priority)}
            </th>
            {columns.rating && <th>{intl.formatMessage(messages.rating)}</th>}
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
          </tr>
        </thead>
        <tbody>
          {displayBeatmapsets.slice((page - 1) * pageSize, page * pageSize).map((beatmapset) => (
            <SubmissionBeatmapset
              key={beatmapset.id}
              beatmapset={beatmapset}
              columns={columns}
              gameMode={gameMode}
              onReviewDelete={onReviewDelete}
              onReviewUpdate={onReviewUpdate}
              showStatus={beatmapStatus === 'lovedAndRanked'}
              usersById={submissionsInfo.usersById}
            />
          ))}
        </tbody>
      </table>
      <PageSelector page={page} pageCount={pageCount} setPage={setPage} />
    </>
  );
}
