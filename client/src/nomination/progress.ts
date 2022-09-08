import { DescriptionState, MetadataState, ModeratorState, Role } from 'loved-bridge/tables';
import type { INomination, IUserWithRoles } from '../interfaces';
import { hasRole } from '../permissions';

export const enum NominationProgressWarning {
  descriptionMissing,
  descriptionNeedsReview,
  metadataAssigneesMissing,
  metadataUnchecked,
  metadataNeedsChange,
  moderatorAssigneesMissing,
  moderatorUnchecked,
  moderatorNeedsChange,
  moderatorSentToReview,
}

export function nominationProgressWarnings(
  nomination: INomination,
  user: IUserWithRoles,
): Set<NominationProgressWarning> {
  const warnings = new Set<NominationProgressWarning>();

  if (hasRole(user, Role.captain, nomination.game_mode, true)) {
    if (nomination.description == null) {
      warnings.add(NominationProgressWarning.descriptionMissing);
    }

    if (
      nomination.description_author?.id === user.id &&
      nomination.description_state === DescriptionState.notReviewed
    ) {
      warnings.add(NominationProgressWarning.descriptionNeedsReview);
    }
  }

  if (hasRole(user, Role.metadata, undefined, true)) {
    if (nomination.metadata_assignees.length === 0) {
      warnings.add(NominationProgressWarning.metadataAssigneesMissing);
    }

    if (nomination.metadata_assignees.some((assignee) => assignee.id === user.id)) {
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

  if (hasRole(user, Role.moderator, undefined, true)) {
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

  if (hasRole(user, Role.news, undefined, true)) {
    if (nomination.metadata_assignees.length === 0) {
      warnings.add(NominationProgressWarning.metadataAssigneesMissing);
    }

    if (nomination.moderator_assignees.length === 0) {
      warnings.add(NominationProgressWarning.moderatorAssigneesMissing);
    }

    if (
      nomination.description != null &&
      nomination.description_state === DescriptionState.notReviewed
    ) {
      warnings.add(NominationProgressWarning.descriptionNeedsReview);
    }
  }

  return warnings;
}
