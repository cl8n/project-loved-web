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

type UserWithRoles = import('loved-bridge/tables').User & {
  roles: import('loved-bridge/tables').UserRole[];
};

//#region Express
declare namespace Express {
  interface Request {
    // Required properties are not actually required
    session: import('express-session').Session &
      Partial<import('express-session').SessionData> &
      import('loved-bridge/tables').TokenInfo & {
        authBackUrl?: string | undefined;
        authState?: string;
        userId: number;
      };
  }

  interface Response {
    // Required properties are not actually required
    typedLocals: {
      osu: import('./osu').Osu;
      user: UserWithRoles;
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
  mode_int: import('loved-bridge/beatmaps/gameMode').GameMode;
  playcount: number;
  ranked: import('loved-bridge/beatmaps/rankedStatus').RankedStatus;
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
  ranked: import('loved-bridge/beatmaps/rankedStatus').RankedStatus;
  submitted_date: string;
  title: string;
  user_id: number;
}

interface OsuApiForumPost {
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
}

interface OsuApiForumTopic {
  created_at: string;
  deleted_at: string | null;
  first_post_id: number;
  forum_id: number;
  id: number;
  is_locked: boolean;
  last_post_id: number;
  poll?: {
    allow_vote_change: boolean;
    ended_at: string | null;
    hide_incomplete_results: boolean;
    last_vote_at: string | null;
    max_votes: number;
    options: {
      id: number;
      text: {
        bbcode: string;
        html: string;
      };
      vote_count?: number;
    }[];
    started_at: string;
    title: {
      bbcode: string;
      html: string;
    };
    total_vote_count: number;
  } | null;
  post_count: number;
  title: string;
  type: 'announcement' | 'normal' | 'sticky';
  updated_at: string;
  user_id: number;
}

type OsuApiScopes = Exclude<import('loved-bridge/tables').TokenInfo['scopes'], undefined>;

interface OsuApiUser {
  avatar_url: string;
  country_code: string;
  id: number;
  previous_usernames: string[];
  username: string;
  [key: string]: unknown;
}
//#endregion
