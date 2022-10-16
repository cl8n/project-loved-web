import {
  CreatorsState,
  DescriptionState,
  MetadataState,
  ModeratorState,
  Role,
} from 'loved-bridge/tables';
import type { INomination, IRound, IUserWithRoles } from '../interfaces';
import { hasRole } from '../permissions';

export enum NominationProgressWarning {
  creatorsUnchecked,
  descriptionMissing,
  descriptionNeedsReview,
  difficultiesUnset,
  metadataAssigneesMissing,
  metadataUnchecked,
  metadataNeedsChange,
  moderatorAssigneesMissing,
  moderatorUnchecked,
  moderatorNeedsChange,
  moderatorSentToReview,
}

export const nominationProgressWarningMessages: Record<NominationProgressWarning, string> = {
  [NominationProgressWarning.creatorsUnchecked]: 'Creators need to be checked',
  [NominationProgressWarning.descriptionMissing]: 'Missing description',
  [NominationProgressWarning.descriptionNeedsReview]: 'Description needs to be reviewed',
  [NominationProgressWarning.difficultiesUnset]: 'Excluded difficulties need to be set',
  [NominationProgressWarning.metadataAssigneesMissing]: 'Metadata reviewers need to be assigned',
  [NominationProgressWarning.metadataUnchecked]: 'Metadata needs to be checked',
  [NominationProgressWarning.metadataNeedsChange]:
    'Metadata needs to be re-checked after the map is updated',
  [NominationProgressWarning.moderatorAssigneesMissing]: 'Moderators need to be assigned',
  [NominationProgressWarning.moderatorUnchecked]: 'Content needs to be checked by a moderator',
  [NominationProgressWarning.moderatorNeedsChange]:
    'Content needs to be re-checked by a moderator after the map is updated',
  [NominationProgressWarning.moderatorSentToReview]: 'Waiting on result of moderation review',
};

export function nominationProgressWarnings(
  nomination: INomination,
  round: IRound,
  user: IUserWithRoles,
): Set<NominationProgressWarning> {
  const warnings = new Set<NominationProgressWarning>();

  if (hasRole(user, Role.captain, nomination.game_mode, true)) {
    if (!round.ignore_creator_and_difficulty_checks && !nomination.difficulties_set) {
      warnings.add(NominationProgressWarning.difficultiesUnset);
    }

    // TODO: Uncomment when captains can change beatmapset creators
    // if (!round.ignore_creator_and_difficulty_checks && nomination.creators_state === CreatorsState.unchecked) {
    //   warnings.add(NominationProgressWarning.creatorsUnchecked);
    // }

    if (nomination.description == null) {
      warnings.add(NominationProgressWarning.descriptionMissing);
    }
  }

  if (hasRole(user, Role.metadata, undefined, true)) {
    if (nomination.metadata_assignees.length === 0) {
      warnings.add(NominationProgressWarning.metadataAssigneesMissing);
    }

    if (nomination.metadata_assignees.some((assignee) => assignee.id === user.id)) {
      if (
        !round.ignore_creator_and_difficulty_checks &&
        nomination.creators_state !== CreatorsState.good
      ) {
        warnings.add(NominationProgressWarning.creatorsUnchecked);
      }

      switch (nomination.metadata_state) {
        case MetadataState.unchecked:
          warnings.add(NominationProgressWarning.metadataUnchecked);
          break;
        case MetadataState.needsChange:
          warnings.add(NominationProgressWarning.metadataNeedsChange);
          break;
      }
    }
  }

  if (!round.ignore_moderator_checks && hasRole(user, Role.moderator, undefined, true)) {
    if (nomination.moderator_assignees.length === 0) {
      warnings.add(NominationProgressWarning.moderatorAssigneesMissing);
    }

    if (nomination.moderator_assignees.some((assignee) => assignee.id === user.id)) {
      switch (nomination.moderator_state) {
        case ModeratorState.unchecked:
          warnings.add(NominationProgressWarning.moderatorUnchecked);
          break;
        case ModeratorState.needsChange:
          warnings.add(NominationProgressWarning.moderatorNeedsChange);
          break;
        case ModeratorState.sentToReview:
          warnings.add(NominationProgressWarning.moderatorSentToReview);
          break;
      }
    }
  }

  if (
    hasRole(user, Role.newsEditor, undefined, true) &&
    nomination.description != null &&
    nomination.description_state === DescriptionState.notReviewed
  ) {
    warnings.add(NominationProgressWarning.descriptionNeedsReview);
  }

  if (hasRole(user, Role.newsAuthor, undefined, true)) {
    if (
      !round.ignore_creator_and_difficulty_checks &&
      nomination.creators_state !== CreatorsState.good
    ) {
      warnings.add(NominationProgressWarning.creatorsUnchecked);
    }

    if (nomination.metadata_assignees.length === 0) {
      warnings.add(NominationProgressWarning.metadataAssigneesMissing);
    }

    if (!round.ignore_moderator_checks && nomination.moderator_assignees.length === 0) {
      warnings.add(NominationProgressWarning.moderatorAssigneesMissing);
    }
  }

  return warnings;
}
