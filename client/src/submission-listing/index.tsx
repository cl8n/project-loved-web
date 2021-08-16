import { apiErrorMessage, getSubmissions, useApi } from '../api';
import SubmissionBeatmapset from './submission-beatmapset';
import Help from '../Help';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import { gameModeFromShortName, gameModeLongName, gameModes, gameModeShortName } from '../osu-helpers';
import { ChangeEvent } from 'react';
import { GameMode, IReview } from '../interfaces';
import { useOsuAuth } from '../osuAuth';
import { isCaptainForMode } from '../permissions';

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
      <h1>Submitted maps</h1>
      <p className='flex-left'>
        <label htmlFor='gameMode'>Game mode:</label>
        <select
          name='gameMode'
          value={gameMode}
          onChange={onGameModeChange}
        >
          {gameModes.map((m) => (
            <option key={m} value={m}>{gameModeLongName(m)}</option>
          ))}
        </select>
      </p>
      <SubmissionListing gameMode={gameMode} />
    </>
  );
}

interface SubmissionListingProps {
  gameMode: GameMode;
}

function SubmissionListing({ gameMode }: SubmissionListingProps) {
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
          <th>Beatmapset</th>
          <th>Mapper</th>
          <th>Priority</th>
          <th>Score <Help text='A placeholder method to sort this listing. Score = Favorites × 50 + Plays' /></th>
          <th>Plays</th>
          <th>Favs</th>
          <th>Year</th>
          <th>Diffs</th>
          <th>BPM</th>
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
