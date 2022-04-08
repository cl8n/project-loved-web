import type { GameMode } from './beatmaps/gameMode';
import type { RankedStatus } from './beatmaps/rankedStatus';

declare global {
  type TableDateType = unknown;
}

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

export enum LogType {
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
  deleted_at: TableDateType | null;
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
  api_fetched_at: TableDateType;
  artist: string;
  creator_id: number;
  creator_name: string;
  deleted_at: TableDateType | null;
  favorite_count: number;
  play_count: number;
  ranked_status: RankedStatus;
  submitted_at: TableDateType;
  title: string;
  updated_at: TableDateType;
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
  updated_at: TableDateType;
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
  created_at: TableDateType;
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
  ended_at: TableDateType;
  game_mode: GameMode;
  result_no: number | null;
  result_yes: number | null;
  round_id: number;
  started_at: TableDateType;
  topic_id: number;
}

export interface Review {
  id: number;
  beatmapset_id: number;
  game_mode: GameMode;
  reason: string;
  reviewed_at: TableDateType;
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
  news_posted_at: TableDateType | null;
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
  submitted_at: TableDateType | null;
  submitter_id: number | null;
}

export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
}

export interface User {
  id: number;
  api_fetched_at: TableDateType;
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
