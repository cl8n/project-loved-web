import { DescriptionState, INominationWithPollResult, MetadataState, ModeratorState } from '../interfaces';
import ListInline from '../ListInline';

function descriptionClass(description: string | undefined, state: DescriptionState) {
  if (state === DescriptionState.reviewed)
    return 'success';

  return description == null ? 'error' : 'pending';
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
    case ModeratorState.unchecked:
      return 'error';
    case ModeratorState.needsChange:
    case ModeratorState.sentToReview:
      return 'pending';
    case ModeratorState.good:
      return 'success';
    case ModeratorState.notAllowed:
      return 'panic';
  }
}

function votingClass(opened: boolean, result: boolean | undefined) {
  if (result == null)
    return opened ? 'pending' : 'error';

  return result ? 'success' : 'panic';
}

type StatusLineProps = {
  ignoreModeratorChecks: boolean;
  locked: boolean;
  nomination: INominationWithPollResult;
  pollsOpened: boolean;
  votingResult: boolean | undefined;
};

export default function StatusLine({ ignoreModeratorChecks, locked, nomination, pollsOpened, votingResult }: StatusLineProps) {
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
      <span className={votingClass(pollsOpened, votingResult)}>Voting</span>
      {' → '}
      <span className={nomination.beatmapset.ranked_status === 4 ? 'success' : 'error'}>Loved</span>
    </div>
  );
}
