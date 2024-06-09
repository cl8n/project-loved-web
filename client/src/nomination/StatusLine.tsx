import { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import type { Round } from 'loved-bridge/tables';
import {
  CreatorsState,
  DescriptionState,
  MetadataState,
  ModeratorState,
} from 'loved-bridge/tables';
import type { INominationWithPoll } from '../interfaces';
import ListInline from '../ListInline';

function creatorsClass(state: CreatorsState) {
  switch (state) {
    case CreatorsState.unchecked:
      return 'error';
    case CreatorsState.checkedOnlyByCaptain:
      return 'pending';
    case CreatorsState.good:
      return 'success';
  }
}

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
  nomination: INominationWithPoll;
  round: Round;
  votingResult: boolean | undefined;
}

export default function StatusLine({ nomination, round, votingResult }: StatusLineProps) {
  const infoArray = [
    // eslint-disable-next-line react/jsx-key
    <span className={descriptionClass(nomination.description, nomination.description_state)}>
      Description
    </span>,
    // eslint-disable-next-line react/jsx-key
    <span className={metadataClass(nomination.metadata_state)}>Metadata</span>,
  ];

  const ignoreCreatorAndDifficultyChecks =
    round.ignore_creator_and_difficulty_checks &&
    nomination.creators_state === CreatorsState.unchecked &&
    !nomination.difficulties_set;
  const ignoreModeratorChecks =
    round.ignore_moderator_checks &&
    nomination.moderator_assignees.length === 0 &&
    nomination.moderator_state === ModeratorState.unchecked;

  if (!ignoreModeratorChecks) {
    infoArray.push(<span className={moderationClass(nomination.moderator_state)}>Moderation</span>);
  }

  return (
    <div>
      {!ignoreCreatorAndDifficultyChecks && (
        <>
          <span className={nomination.difficulties_set ? 'success' : 'error'}>Difficulties</span>
          {' → '}
          <span className={creatorsClass(nomination.creators_state)}>Creators</span>
          {' → '}
        </>
      )}
      <ListInline array={infoArray} onlyCommas />
      {' → '}
      <span className={votingClass(nomination.poll != null, votingResult)}>Voting</span>
      {' → '}
      <span
        className={nomination.beatmapset.ranked_status === RankedStatus.loved ? 'success' : 'error'}
      >
        Loved
      </span>
    </div>
  );
}
