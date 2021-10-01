declare const enum GameMode {
  osu,
  taiko,
  catch,
  mania,
}

declare const enum RankedStatus {
  graveyard = -2,
  workInProgress = -1,
  pending = 0,
  ranked = 1,
  approved = 2,
  qualified = 3,
  loved = 4,
}

declare const enum SyslogLevel {
  emerg,
  alert,
  crit,
  err,
  warning,
  notice,
  info,
  debug,
}

type AuthUser = Omit<UserWithRoles, 'api_fetched_at'>;

interface UserWithRoles extends User {
  roles: UserRoles;
}

//#region Database
declare const enum AssigneeType {
  metadata,
  moderator,
}

declare const enum ConsentValue {
  no,
  yes,
  unreachable,
}

declare const enum DescriptionState {
  notReviewed,
  reviewed,
}

declare const enum LogType {
  error,
  action,
  analytic,
}

declare const enum MetadataState {
  unchecked,
  needsChange,
  good,
}

declare const enum ModeratorState {
  unchecked,
  needsChange,
  sentToReview,
  good,
  notAllowed,
}

interface Beatmap {
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

interface Beatmapset {
  id: number;
  api_fetched_at: Date;
  artist: string;
  creator_id: number;
  creator_name: string;
  favorite_count: number;
  play_count: number;
  ranked_status: RankedStatus;
  submitted_at: Date;
  title: string;
  updated_at: Date;
}

interface BeatmapsetCreator {
  beatmapset_id: number;
  creator_id: number;
  game_mode: GameMode;
}

interface Consent {
  user_id: number;
  consent: ConsentValue | null;
  consent_reason: string | null;
  updated_at: Date;
  updater_id: number;
}

interface ConsentBeatmapset {
  beatmapset_id: number;
  user_id: number;
  consent: boolean;
  consent_reason: string | null;
}

interface Log {
  id: number;
  created_at: Date;
  type: number;
}

interface LogValue {
  log_id: number;
  parameter: number;
  value_int: number | null;
  value_text: string | null;
}

interface Nomination {
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

interface NominationAssignee {
  assignee_id: number;
  nomination_id: number;
  type: AssigneeType;
}

interface NominationExcludedBeatmap {
  beatmap_id: number;
  nomination_id: number;
}

interface NominationNominator {
  nomination_id: number;
  nominator_id: number;
}

interface Poll {
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

interface Review {
  id: number;
  beatmapset_id: number;
  game_mode: GameMode;
  reason: string;
  reviewed_at: Date;
  reviewer_id: number;
  score: number;
}

type Role =
  | 'alumni'
  | 'captain'
  | 'dev'
  | 'god'
  | 'god_readonly'
  | 'metadata'
  | 'moderator'
  | 'news';

interface Round {
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

interface RoundGameMode {
  round_id: number;
  game_mode: GameMode;
  nominations_locked: boolean;
  results_post_id: number | null;
  voting_threshold: number;
}

interface Submission {
  id: number;
  beatmapset_id: number;
  game_mode: GameMode;
  reason: string | null;
  submitted_at: Date | null;
  submitter_id: number | null;
}

interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
}

interface User {
  id: number;
  api_fetched_at: Date;
  avatar_url: string;
  banned: boolean;
  country: string;
  name: string;
}

interface UserName {
  id: number;
  name: string;
}

type UserRoles = Record<Role, boolean> & {
  alumni_game_mode: GameMode | null;
  captain_game_mode: GameMode | null;
};
//#endregion

//#region Express
declare namespace Express {
  interface Request {
    // Required properties are not actually required
    session: import('express-session').Session &
      Partial<import('express-session').SessionData> &
      TokenInfo & {
        authBackUrl?: string | undefined;
        authState?: string;
        userId: number;
      };
  }

  interface Response {
    // Required properties are not actually required
    typedLocals: {
      osu: import('./osu').Osu;
      user: AuthUser;
    };
  }
}

type Req<Body = Record<string, unknown>> = import('express').Request<
  Record<string, string>,
  unknown,
  Body,
  Partial<Record<string, string>>
>;
//#endregion

//#region osu! API
interface OsuApiBeatmap {
  beatmapset_id: number;
  bpm: number;
  cs: number;
  deleted_at?: string | null;
  difficulty_rating: number;
  id: number;
  mode_int: GameMode;
  playcount: number;
  ranked: RankedStatus;
  total_length: number;
  version: string;
}

interface OsuApiBeatmapset {
  artist: string;
  beatmaps: OsuApiBeatmap[];
  creator: string;
  favourite_count: number;
  id: number;
  last_updated: string;
  play_count: number;
  ranked: RankedStatus;
  submitted_date: string;
  title: string;
  user_id: number;
}

interface OsuApiForumTopic {
  posts: {
    body: {
      html: string;
      raw: string;
    };
    created_at: string;
    deleted_at: string | null;
    edited_at: string | null;
    edited_by_id: number | null;
    forum_id: number;
    id: number;
    topic_id: number;
    user_id: number;
  }[];
  topic: {
    created_at: string;
    deleted_at: string | null;
    first_post_id: number;
    forum_id: number;
    id: number;
    is_locked: boolean;
    last_post_id: number;
    post_count: number;
    title: string;
    type: 'announcement' | 'normal' | 'sticky';
    updated_at: string;
    user_id: number;
  };
}

interface OsuApiUser {
  avatar_url: string;
  country_code: string;
  id: number;
  previous_usernames: string[];
  username: string;
  [key: string]: unknown;
}
//#endregion
