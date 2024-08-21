import type { GameMode } from './beatmaps/gameMode.js';
import type { RankedStatus } from './beatmaps/rankedStatus.js';

declare global {
  type TableDateType = unknown;
}

export type AssigneeType = 'metadata' | 'moderator' | 'news_editor';

export enum ConsentValue {
  no,
  yes,
  unreachable,
}

export enum CreatorsState {
  unchecked,
  checkedOnlyByCaptain,
  good,
}

export enum DescriptionState {
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
  extraTokenCreated,
  extraTokenDeleted,
  pollCreated,
  pollUpdated,
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

export enum MetadataState {
  unchecked,
  needsChange,
  good,
}

export enum ModeratorState {
  unchecked,
  needsChange,
  sentToReview,
  good,
  notAllowed,
}

export enum PacksState {
  notUploaded,
  uploadedInitial,
  uploadedFinal,
}

export enum Role {
  admin,
  captain,
  metadata,
  moderator,
  newsEditor,
  developer,
  spectator,
  video,
  newsAuthor,
  packUploader,
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
  creator_id: number;
  nomination_id: number;
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

export interface ExtraToken {
  user_id: number;
  token: TokenInfo;
}

export interface InteropKey {
  key: string;
  user_id: number;
}

export interface Log {
  id: number;
  created_at: TableDateType;
  type: LogType;
  values: Record<string, unknown> | null;
}

export interface Nomination {
  id: number;
  beatmapset_id: number;
  category: string | null;
  creators_state: CreatorsState;
  description: string | null;
  description_author_id: number | null;
  description_state: DescriptionState;
  difficulties_set: boolean;
  game_mode: GameMode;
  metadata_state: MetadataState;
  moderator_state: ModeratorState;
  order: number;
  overwrite_artist: string | null;
  overwrite_title: string | null;
  parent_id: number | null;
  round_id: number | null;
}

export interface NominationAssignee {
  assignee_id: number;
  nomination_id: number;
  type: AssigneeType;
}

export interface NominationDescriptionEdit {
  id: number;
  description: string | null;
  edited_at: TableDateType;
  editor_id: number;
  nomination_id: number;
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
  ignore_creator_and_difficulty_checks: boolean;
  ignore_moderator_checks: boolean;
  ignore_news_editor_assignees: boolean;
  ignore_packs_checks: boolean;
  name: string;
  news_author_id: number;
  news_intro: string | null;
  news_intro_preview: string | null;
  news_outro: string | null;
  news_posted_at: TableDateType | null;
  packs_state: PacksState;
  video: string | null;
}

export interface RoundGameMode {
  round_id: number;
  game_mode: GameMode;
  nominations_locked: boolean;
  results_post_id: number | null;
  video: string | null;
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
  scopes?: ('chat.write' | 'forum.write' | 'identify' | 'public')[];
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
