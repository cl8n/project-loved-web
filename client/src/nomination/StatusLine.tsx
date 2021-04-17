import { DescriptionState, INominationWithPollResult, MetadataState, ModeratorState } from '../interfaces';
import ListInline from '../ListInline';

function descriptionClass(description: string | undefined, state: DescriptionState) {
  if (description == null)
    return 'error';

  return state === DescriptionState.reviewed ? 'success' : 'pending';
}

function metadataClass(state: MetadataState) {
  switch (state) {
    case MetadataState.unchecked:
      return 'error';
    case MetadataState.needsChange:
      return 'pending';
    case MetadataState.good:
      return 'success';
  }
}

function moderationClass(state: ModeratorState) {
  switch (state) {
    case ModeratorState.notAllowed:
    case ModeratorState.unchecked:
      return 'error';
    case ModeratorState.needsChange:
      return 'pending';
    case ModeratorState.good:
      return 'success';
  }
}

function votingClass(status: boolean | undefined) {
  if (status == null)
    return 'pending';

  return status ? 'success' : 'error';
}

type StatusLineProps = {
  ignoreModeratorChecks: boolean;
  locked: boolean;
  nomination: INominationWithPollResult;
  votingStatus: boolean | undefined;
};

export default function StatusLine({ ignoreModeratorChecks, locked, nomination, votingStatus }: StatusLineProps) {
  const infoArray = [
    <span className={descriptionClass(nomination.description, nomination.description_state)}>Description</span>,
    <span className={metadataClass(nomination.metadata_state)}>Metadata</span>,
  ];

  if (!ignoreModeratorChecks)
    infoArray.push(<span className={moderationClass(nomination.moderator_state)}>Moderation</span>);

  return (
    <div>
      <span className={locked ? 'success' : 'error'}>Locked nominations</span>
      {' → '}
      <ListInline array={infoArray} onlyCommas />
      {' → '}
      <span className={votingClass(votingStatus)}>Voting</span>
      {' → '}
      <span className={nomination.beatmapset.ranked_status === 4 ? 'success' : 'error'}>Loved</span>
    </div>
  );
}
