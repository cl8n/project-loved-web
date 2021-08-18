import { apiErrorMessage, getSubmissions, useApi } from '../api';
import SubmissionBeatmapset from './submission-beatmapset';
import Help from '../Help';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import { gameModeFromShortName, gameModeLongName, gameModes, gameModeShortName } from '../osu-helpers';
import { ChangeEvent } from 'react';
import { GameMode, IReview } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import { isCaptainForMode } from '../permissions';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

const messages = defineMessages({
  favorites: {
    defaultMessage: 'Favs',
    description: 'Submissions table header',
  },
  plays: {
    defaultMessage: 'Plays',
    description: 'Submissions table header',
  },
});

export default function SubmissionListingContainer() {
  const history = useHistory();
  const params = useParams<{ gameMode: string; }>();

  let gameMode = gameModeFromShortName(params.gameMode);

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
      <p className='flex-left'>
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
      </p>
      <SubmissionListing gameMode={gameMode} />
    </>
  );
}

interface SubmissionListingProps {
  gameMode: GameMode;
}

function SubmissionListing({ gameMode }: SubmissionListingProps) {
  const intl = useIntl();
  const authUser = useOsuAuth().user;
  const [submissionsInfo, submissionsInfoError, setSubmissionsInfo] = useApi(getSubmissions, [gameMode]);

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
    <table className='main-table'>
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
          <FormattedMessage
            defaultMessage='Score <help>A placeholder method to sort this listing. Score{definition}</help>'
            description='Submissions table header'
            tagName='th'
            values={{
              definition: ` = ${intl.formatMessage(messages.favorites)} × 50 + ${intl.formatMessage(messages.plays)}`,
              help: (c: string) => <Help text={c} />,
            }}
          />
          <th>{intl.formatMessage(messages.plays)}</th>
          <th>{intl.formatMessage(messages.favorites)}</th>
          <FormattedMessage
            defaultMessage='Year'
            description='Submissions table header'
            tagName='th'
          />
          <FormattedMessage
            defaultMessage='Diffs'
            description='Submissions table header'
            tagName='th'
          />
          <FormattedMessage
            defaultMessage='BPM'
            description='Submissions table header'
            tagName='th'
          />
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
