import type { User } from 'loved-bridge/tables';
import { Role } from 'loved-bridge/tables';
import { alertApiErrorMessage, deleteNomination } from '../api';
import { BeatmapInline } from '../BeatmapInline';
import type { INominationForPlanner } from '../interfaces';
import ListInline from '../ListInline';
import { useOsuAuth } from '../osuAuth';
import { hasRole } from '../permissions';
import { combineReviewsAndSubmissions } from '../submission-listing/helpers';
import SubmissionsList from '../submission-listing/SubmissionsList';
import { UserInline } from '../UserInline';

interface NominationProps {
  nomination: INominationForPlanner;
  onNominationDelete: (nominationId: number) => void;
  submissionUsersById: Record<number, User>;
}

// TODO find some way to merge with the one in Picks.tsx
export default function Nomination({
  nomination,
  onNominationDelete,
  submissionUsersById,
}: NominationProps) {
  const authUser = useOsuAuth().user;

  const deleteSelf = () => {
    if (!window.confirm('Are you sure you want to delete this nomination from the planner?')) {
      return;
    }

    deleteNomination(nomination.id)
      .then(() => onNominationDelete(nomination.id))
      .catch(alertApiErrorMessage);
  };

  const canDelete = hasRole(authUser, Role.captain, nomination.game_mode);

  return (
    <div className='box nomination'>
      <div className='flex-bar'>
        <span>
          <h3 className='nomination-title'>
            <BeatmapInline
              artist={nomination.overwrite_artist}
              beatmapset={nomination.beatmapset}
              gameMode={nomination.game_mode}
              title={nomination.overwrite_title}
            />{' '}
            [#{nomination.id}]
          </h3>
          {canDelete && (
            <>
              {' — '}
              <button type='button' className='error fake-a' onClick={deleteSelf}>
                Delete
              </button>
            </>
          )}
        </span>
        <span className='flex-no-shrink'>
          Added by{' '}
          <ListInline
            array={nomination.nominators}
            none='nobody'
            render={(user) => <UserInline user={user} />}
          />
        </span>
      </div>
      <div>
        by{' '}
        <ListInline
          array={nomination.beatmapset_creators}
          none='nobody'
          render={(user) => <UserInline user={user} />}
        />
      </div>
      {nomination.reviews.length + nomination.submissions.length > 0 && (
        <SubmissionsList
          reviewsAndSubmissions={combineReviewsAndSubmissions(
            nomination.reviews,
            nomination.submissions,
          )}
          usersById={submissionUsersById}
        />
      )}
    </div>
  );
}
