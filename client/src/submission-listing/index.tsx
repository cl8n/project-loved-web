import { apiErrorMessage, getSubmissions, useApi } from '../api';
import SubmissionBeatmapset from './submission-beatmapset';
import Help from '../Help';
import { Redirect, useHistory, useLocation, useParams } from 'react-router-dom';
import { gameModeFromShortName, gameModeLongName, gameModes, gameModeShortName } from '../osu-helpers';
import { ChangeEvent, useEffect, useReducer } from 'react';
import { GameMode, IReview } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import { isCaptainForMode } from '../permissions';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { ToggleableColumn, toggleableColumns, ToggleableColumnsState } from './helpers';

const messages = defineMessages({
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
  playCount: {
    defaultMessage: 'Plays',
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
  year: {
    defaultMessage: 'Year',
    description: 'Submissions table header',
  },
});

function columnsReducer(prevState: ToggleableColumnsState, column: ToggleableColumn): ToggleableColumnsState {
  return {
    ...prevState,
    [column]: !prevState[column],
  };
}

export default function SubmissionListingContainer() {
  const history = useHistory();
  const intl = useIntl();
  const params = useParams<{ gameMode: string; }>();
  const [columns, toggleColumn] = useReducer(columnsReducer, {
    bpm: true,
    difficultyCount: true,
    favoriteCount: true,
    playCount: true,
    score: true,
    year: true,
  });

  const gameMode = gameModeFromShortName(params.gameMode);

  if (gameMode == null) {
    return <Redirect to='/submissions/osu' />;
  }

  const onGameModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newMode = parseInt(event.currentTarget.value);

    if (newMode !== gameMode) {
      history.push(`/submissions/${gameModeShortName(newMode)}`);
    }
  };

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
            This listing is not yet in active use by captains. The submissions made to the Google forms will be migrated
            here soon, and from then on captains will be using this instead of the Google sheets. Currently you can use
            either this website or the Google forms to make new submissions.
          '
          description='Warning box above submissions table'
        />
      </div>
      <div className='flex-left'>
        <FormattedMessage
          defaultMessage='<label>Game mode:</label> {selector}'
          description='Selector to change game mode'
          values={{
            label: (c: string) => <label htmlFor='gameMode'>{c}</label>,
            selector: (
              <select
                name='gameMode'
                value={gameMode}
                onChange={onGameModeChange}
              >
                {gameModes.map((m) => (
                  <option key={m} value={m}>{gameModeLongName(m)}</option>
                ))}
              </select>
            ),
          }}
        />
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
      </div>
      <SubmissionListing columns={columns} gameMode={gameMode} />
    </>
  );
}

interface SubmissionListingProps {
  columns: ToggleableColumnsState;
  gameMode: GameMode;
}

function SubmissionListing({ columns, gameMode }: SubmissionListingProps) {
  const history = useHistory();
  const intl = useIntl();
  const { pathname: locationPath, state: submittedBeatmapsetId } = useLocation<number | undefined>();
  const authUser = useOsuAuth().user;
  const [submissionsInfo, submissionsInfoError, setSubmissionsInfo] = useApi(getSubmissions, [gameMode]);

  useEffect(() => {
    if (submissionsInfo == null || submittedBeatmapsetId == null)
      return;

    document
      .querySelector(`[data-beatmapset-id="${submittedBeatmapsetId}"]`)
      ?.scrollIntoView();
    history.replace(locationPath);
  }, [history, locationPath, submissionsInfo, submittedBeatmapsetId]);

  if (submissionsInfoError != null)
    return <span className='panic'>Failed to load submissions: {apiErrorMessage(submissionsInfoError)}</span>;

  if (submissionsInfo == null)
    return <span>Loading submissions...</span>;

  const canReview = authUser != null && isCaptainForMode(authUser, gameMode);
  const onReviewUpdate = (review: IReview) => {
    setSubmissionsInfo((prev) => {
      const beatmapset = prev!.beatmapsets.find((beatmapset) => beatmapset.id === review.beatmapset_id)!;
      const existingReview = beatmapset.reviews.find((existing) => existing.id === review.id);

      if (existingReview != null) {
        beatmapset.review_score += review.score - existingReview.score;
        Object.assign(existingReview, review);
      } else {
        if (beatmapset.reviews.length > 0) {
          beatmapset.review_score += review.score;
        } else {
          beatmapset.review_score = review.score;
        }

        beatmapset.reviews.push(review);
      }

      if (prev!.usersById[review.captain_id] == null) {
        prev!.usersById[review.captain_id] = { ...authUser!, alumni: authUser!.roles.alumni };
      }

      // TODO: Re-sort beatmapsets?

      return {
        beatmapsets: prev!.beatmapsets,
        usersById: prev!.usersById,
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
          <FormattedMessage
            defaultMessage='Priority'
            description='Submissions table header'
            tagName='th'
          />
          {columns.score && (
            <th>
              {intl.formatMessage(messages.score)}
              {' '}
              <Help>
                {intl.formatMessage(messages.scoreHelp, {
                  definition: `${intl.formatMessage(messages.score)} = ${intl.formatMessage(messages.favoriteCount)} × 75 + ${intl.formatMessage(messages.playCount)}`,
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
          {canReview && <th />}
        </tr>
      </thead>
      <tbody>
        {submissionsInfo.beatmapsets.map((beatmapset) => (
          <SubmissionBeatmapset
            key={beatmapset.id}
            beatmapset={beatmapset}
            canReview={canReview}
            columns={columns}
            gameMode={gameMode}
            onReviewUpdate={onReviewUpdate}
            review={canReview ? beatmapset.reviews.find((review) => review.captain_id === authUser!.id) : undefined}
            usersById={submissionsInfo.usersById}
          />
        ))}
      </tbody>
    </table>
  );
}
