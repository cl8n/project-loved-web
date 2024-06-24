import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import type { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import type {
  Beatmapset,
  ConsentValue,
  CreatorsState,
  DescriptionState,
  MetadataState,
  ModeratorState,
  Nomination,
  NominationDescriptionEdit,
  Review,
  Role,
  Round,
  RoundGameMode,
  Submission,
  User,
} from 'loved-bridge/tables';

// TODO: Replace most of this with bridge types

interface IGenericBeatmap {
  id: number;
  beatmapset_id: number;
  bpm: number;
  deleted_at: string | null;
  play_count: number;
  ranked_status: RankedStatus;
  star_rating: number;
  version: string;
}

interface INotManiaBeatmap extends IGenericBeatmap {
  game_mode: Exclude<GameMode, GameMode.mania>;
}

interface IManiaBeatmap extends IGenericBeatmap {
  game_mode: GameMode.mania;
  key_count: number;
}

export type IBeatmap = IManiaBeatmap | INotManiaBeatmap;

export type IBeatmapWithExcluded = IBeatmap & {
  excluded: boolean;
};

export interface INomination {
  id: number;
  beatmaps: IBeatmapWithExcluded[];
  beatmapset: Beatmapset;
  beatmapset_creators: IUser[];
  beatmapset_id: number;
  category: string | null;
  creators_state: CreatorsState;
  description?: string;
  description_author?: IUser;
  description_edits: (NominationDescriptionEdit & { editor: IUser })[];
  description_state: DescriptionState;
  difficulties_set: boolean;
  game_mode: GameMode;
  metadata_assignees: IUser[];
  metadata_state: MetadataState;
  moderator_assignees: IUser[];
  moderator_state: ModeratorState;
  news_editor_assignees: IUser[];
  nominators: IUser[];
  order: number;
  overwrite_artist?: string;
  overwrite_title?: string;
  parent_id?: number;
  round_id: number | null;
}

export interface INominationForPlanner extends Nomination {
  beatmapset: Beatmapset;
  beatmapset_creators: User[];
  nominators: User[];
  reviews: (Review & { active_captain: boolean | null })[];
  submissions: Submission[];
}

export interface INominationWithPoll extends INomination {
  poll?: Omit<IPoll, 'beatmapset' | 'voting_threshold'>;
}

export interface IPoll {
  id: number;
  beatmapset?: Beatmapset;
  ended_at: string;
  game_mode: GameMode;
  result_no: number | null;
  result_yes: number | null;
  round_id: number;
  started_at: string;
  topic_id: number;
  voting_threshold?: number;
}

export interface IReview {
  id: number;
  active_captain: boolean | null;
  beatmapset_id: number;
  game_mode: GameMode;
  reason: string;
  reviewed_at: string;
  reviewer_id: number;
  score: number;
}

export interface IRound extends Round {
  game_modes: Record<GameMode, RoundGameMode>;
}

type ISetting<T> = T | null | undefined;

export interface ISettings {
  defaultVotingThreshold?: Record<GameMode, ISetting<number>>;
  discordWebhook?: Record<GameMode, ISetting<string>>;
  hideNominationStatus?: Record<GameMode, ISetting<boolean>>;
}

export interface ISubmission {
  id: number;
  beatmapset_id: number;
  game_mode: GameMode;
  reason: string | null;
  submitted_at: string | null;
  submitter_id: number | null;
}

export interface IUser {
  id: number;
  avatar_url: string;
  banned: boolean;
  country: string;
  name: string;
}

export interface IUserRole {
  game_mode: GameMode | -1;
  role_id: Role;
  user_id: number;
  alumni: boolean;
}

export interface IUserWithRoles extends IUser {
  roles: IUserRole[];
}

export interface IMapperConsent {
  user_id: number;
  beatmapset_consents: IMapperBeatmapsetConsent[];
  consent: ConsentValue | null;
  consent_reason: string | null;
  mapper: IUser;
  updated_at?: string;
  updater?: IUser;
  updater_id?: number;
}

export interface IMapperBeatmapsetConsent {
  beatmapset_id: number;
  beatmapset: Beatmapset;
  user_id: number;
  consent: boolean;
  consent_reason: string | null;
}

export type PartialWith<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
export type PartialWithId<T extends { id: unknown }> = PartialWith<T, 'id'>;
