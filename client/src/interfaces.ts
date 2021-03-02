export enum DescriptionState {
  notWritten,
  written,
  reviewed,
}

export enum GameMode {
  osu,
  taiko,
  catch,
  mania,
}

export enum LogType {
  error,
  log,
}

export enum MetadataState {
  unchecked,
  needsChange,
  good,
}

export enum ModeratorState {
  unchecked,
  needsChange,
  good,
  notAllowed,
}

export interface IBeatmapset {
  id: number;
  artist: string;
  created_at: Date;
  creator: IUser;
  favorite_count: number;
  play_count: number;
  ranked_status: number;
  submitted_at: Date;
  title: string;
  updated_at: Date;
}

export interface ILog {
  id: number;
  created_at: Date;
  creator: IUser | 'system';
  links: Record<string, string>;
  message: string;
  type: LogType;
}

export interface INomination {
  id: number;
  beatmapset: IBeatmapset;
  description?: string;
  description_author?: IUser;
  description_state: DescriptionState;
  game_mode: GameMode;
  metadata_assignee?: IUser;
  metadata_state: MetadataState;
  moderator_assignee?: IUser;
  moderator_state: ModeratorState;
  nominator: IUser;
  overwrite_artist?: string;
  overwrite_title?: string;
  parent_id?: number;
  round_id: number;
}

export type IRole = 'captain' | 'god' | 'god_readonly' | 'metadata' | 'moderator' | 'news';

export interface IRound {
  id: number;
  polls_ended_at?: Date;
  polls_started_at?: Date;
  name: string;
  news_intro?: string;
  news_intro_preview?: string;
  news_posted_at?: Date;
}

export interface IUser {
  id: number;
  avatar_url: string;
  country: string;
  name: string;
  roles: Record<IRole, boolean> & { captain_game_mode?: GameMode };
}
