import { DescriptionState, MetadataState, ModeratorState } from 'loved-bridge/tables';
import type { INominationWithPoll } from '../interfaces';
import ListInline from '../ListInline';

function descriptionClass(description: string | undefined, state: DescriptionState) {
  if (state === DescriptionState.reviewed) {
    return 'success';
  }

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

function metadataText(state: MetadataState) {
  switch (state) {
    case MetadataState.unchecked:
      return 'Not checked';
    case MetadataState.needsChange:
      return 'Needs change';
    case MetadataState.good:
      return 'Good';
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
  if (result == null) {
    return opened ? 'pending' : 'error';
  }

  return result ? 'success' : 'panic';
}

interface StatusLineProps {
  ignoreModeratorChecks: boolean;
  nomination: INominationWithPoll;
  votingResult: boolean | undefined;
}

export default function StatusLine({
  ignoreModeratorChecks,
  nomination,
  votingResult,
}: StatusLineProps) {
  const infoArray = [
    <span className={descriptionClass(nomination.description, nomination.description_state)}>
      Description
    </span>,
    <span>
      <span className={metadataClass(nomination.metadata_state)}>Metadata</span>
      <i> {`(${metadataText(nomination.metadata_state)})`}</i>
    </span>,
  ];

  if (!ignoreModeratorChecks) {
    infoArray.push(<span className={moderationClass(nomination.moderator_state)}>Moderation</span>);
  }

  return (
    <div>
      <ListInline array={infoArray} onlyCommas />
      {' → '}
      <span className={votingClass(nomination.poll != null, votingResult)}>Voting</span>
      {' → '}
      <span className={nomination.beatmapset.ranked_status === 4 ? 'success' : 'error'}>Loved</span>
    </div>
  );
}
