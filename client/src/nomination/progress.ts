import { DescriptionState, MetadataState, ModeratorState, Role } from 'loved-bridge/tables';
import type { INomination, IUserWithRoles } from '../interfaces';
import { hasRole } from '../permissions';

export enum NominationProgressWarning {
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

export const nominationProgressWarningMessages = {
  [NominationProgressWarning.descriptionMissing]: 'Missing description',
  [NominationProgressWarning.descriptionNeedsReview]: 'Description needs to be reviewed',
  [NominationProgressWarning.metadataAssigneesMissing]: 'Metadata reviewers need to be assigned',
  [NominationProgressWarning.metadataUnchecked]: 'Metadata needs to be checked',
  [NominationProgressWarning.metadataNeedsChange]:
    'Metadata needs to be re-checked after the map is updated',
  [NominationProgressWarning.moderatorAssigneesMissing]: 'Moderators need to be assigned',
  [NominationProgressWarning.moderatorUnchecked]: 'Content needs to be checked by a moderator',
  [NominationProgressWarning.moderatorNeedsChange]:
    'Content needs to be re-checked by a moderator after the map is updated',
  [NominationProgressWarning.moderatorSentToReview]: 'Waiting on result of moderation review',
} as const;
const nominationProgressWarningValues = Object.values(NominationProgressWarning).filter(
  (keyOrValue) => typeof keyOrValue === 'number',
) as NominationProgressWarning[];

export function nominationProgressWarnings(
  nomination: INomination,
  user: IUserWithRoles,
): NominationProgressWarning[] {
  const warnings = new Set<NominationProgressWarning>();

  if (nomination.description == null && hasRole(user, Role.captain, nomination.game_mode, true)) {
    warnings.add(NominationProgressWarning.descriptionMissing);
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

  if (
    hasRole(user, Role.newsEditor, undefined, true) &&
    nomination.description != null &&
    nomination.description_state === DescriptionState.notReviewed
  ) {
    warnings.add(NominationProgressWarning.descriptionNeedsReview);
  }

  if (hasRole(user, Role.newsAuthor, undefined, true)) {
    if (nomination.metadata_assignees.length === 0) {
      warnings.add(NominationProgressWarning.metadataAssigneesMissing);
    }

    if (nomination.moderator_assignees.length === 0) {
      warnings.add(NominationProgressWarning.moderatorAssigneesMissing);
    }
  }

  // Same as `[...warnings]` (and could really just return `warnings`), but we aren't using Set
  // iteration in this project. I didn't yet look into if that would be worth changing.
  return nominationProgressWarningValues.filter((warning) => warnings.has(warning));
}
