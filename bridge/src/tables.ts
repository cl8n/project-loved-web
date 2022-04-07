import type { GameMode } from './beatmaps/gameMode';
import type { RankedStatus } from './beatmaps/rankedStatus';

export const enum AssigneeType {
  metadata,
  moderator,
}

export const enum ConsentValue {
  no,
  yes,
  unreachable,
}

export const enum DescriptionState {
  notReviewed,
  reviewed,
}

export const enum LogType {
  apiServerStarted,
  loggedIn,
  loggedOut,
  userCreated,
  userUpdated,
  roleCreated,
  roleDeleted,
  roleToggledAlumni,
  mapperConsentCreated,
  mapperConsentUpdated,
  mapperConsentBeatmapsetCreated,
  mapperConsentBeatmapsetDeleted,
  mapperConsentBeatmapsetUpdated,
  settingUpdated,
  // submissionCreated,
  // reviewCreated,
  // reviewDeleted,
  // reviewUpdated,
  // beatmapsetCreated,
  // beatmapsetDeleted,
  // beatmapsetSoftDeleted,
  // beatmapsetUpdated,
  // nominationCreated,
  // nominationDeleted,
}

export const enum MetadataState {
  unchecked,
  needsChange,
  good,
}

export const enum ModeratorState {
  unchecked,
  needsChange,
  sentToReview,
  good,
  notAllowed,
}

export const enum Role {
  admin,
  captain,
  metadata,
  moderator,
  news,
  developer,
  spectator,
  video,
}

export interface Beatmap {
  id: number;
  beatmapset_id: number;
  bpm: number;
  deleted_at: Date | null;
  game_mode: GameMode;
  key_count: number | null;
  play_count: number;
  ranked_status: RankedStatus;
  star_rating: number;
  total_length: number;
  version: string;
}

export interface Beatmapset {
  id: number;
  api_fetched_at: Date;
  artist: string;
  creator_id: number;
  creator_name: string;
  deleted_at: Date | null;
  favorite_count: number;
  play_count: number;
  ranked_status: RankedStatus;
  submitted_at: Date;
  title: string;
  updated_at: Date;
}

export interface BeatmapsetCreator {
  beatmapset_id: number;
  creator_id: number;
  game_mode: GameMode;
}

export interface Consent {
  user_id: number;
  consent: ConsentValue | null;
  consent_reason: string | null;
  updated_at: Date;
  updater_id: number;
}

export interface ConsentBeatmapset {
  beatmapset_id: number;
  user_id: number;
  consent: boolean;
  consent_reason: string | null;
}

export interface Log {
  id: number;
  created_at: Date;
  type: LogType;
  values: string | null;
}

export interface Nomination {
  id: number;
  beatmapset_id: number;
  description: string | null;
  description_author_id: number | null;
  description_state: DescriptionState;
  game_mode: GameMode;
  metadata_state: MetadataState;
  moderator_state: ModeratorState;
  order: number;
  overwrite_artist: string | null;
  overwrite_title: string | null;
  parent_id: number | null;
  round_id: number;
}

export interface NominationAssignee {
  assignee_id: number;
  nomination_id: number;
  type: AssigneeType;
}

export interface NominationExcludedBeatmap {
  beatmap_id: number;
  nomination_id: number;
}

export interface NominationNominator {
  nomination_id: number;
  nominator_id: number;
}

export interface Poll {
  id: number;
  beatmapset_id: number;
  ended_at: Date;
  game_mode: GameMode;
  result_no: number | null;
  result_yes: number | null;
  round_id: number;
  started_at: Date;
  topic_id: number;
}

export interface Review {
  id: number;
  beatmapset_id: number;
  game_mode: GameMode;
  reason: string;
  reviewed_at: Date;
  reviewer_id: number;
  score: number;
}

export interface Round {
  id: number;
  done: boolean;
  ignore_moderator_checks: boolean;
  name: string;
  news_author_id: number;
  news_intro: string | null;
  news_intro_preview: string | null;
  news_outro: string | null;
  news_posted_at: Date | null;
}

export interface RoundGameMode {
  round_id: number;
  game_mode: GameMode;
  nominations_locked: boolean;
  results_post_id: number | null;
  voting_threshold: number;
}

export interface Submission {
  id: number;
  beatmapset_id: number;
  game_mode: GameMode;
  reason: string | null;
  submitted_at: Date | null;
  submitter_id: number | null;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
}

export interface User {
  id: number;
  api_fetched_at: Date;
  avatar_url: string;
  banned: boolean;
  country: string;
  name: string;
}

export interface UserName {
  id: number;
  name: string;
}

export interface UserRole {
  game_mode: GameMode | -1;
  role_id: Role;
  user_id: number;
  alumni: boolean;
}
