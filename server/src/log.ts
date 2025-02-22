import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import type {
  Beatmapset,
  ConsentValue,
  LogType,
  Poll,
  Review,
  Round,
  Submission,
  User,
  UserRole,
} from 'loved-bridge/tables';
import { inspect } from 'node:util';
import config from './config.js';
import type { MysqlConnectionType } from './db.js';
import db from './db.js';
import { pick } from './helpers.js';

type LogBeatmapset = Pick<Beatmapset, 'artist' | 'id' | 'title'>;
type LogReview = Pick<Review, 'game_mode' | 'id' | 'reason' | 'score'>;
type LogSubmission = Pick<Submission, 'game_mode' | 'id' | 'reason'>;
type LogUser = Pick<User, 'banned' | 'country' | 'id' | 'name'>;

interface LogValues {
  [LogType.apiServerStarted]: undefined;
  [LogType.loggedIn]: { user: LogUser };
  [LogType.loggedOut]: { user: LogUser };
  [LogType.userCreated]: { user: LogUser };
  [LogType.userUpdated]: { from: LogUser; to: LogUser };
  [LogType.roleCreated]: { actor: LogUser; role: Omit<UserRole, 'user_id'>; user: LogUser };
  [LogType.roleDeleted]: { actor: LogUser; role: Omit<UserRole, 'user_id'>; user: LogUser };
  [LogType.roleToggledAlumni]: { actor: LogUser; role: Omit<UserRole, 'user_id'>; user: LogUser };
  [LogType.mapperConsentCreated]: {
    actor: LogUser;
    consent: ConsentValue | null;
    reason: string | null;
    user: LogUser;
  };
  [LogType.mapperConsentUpdated]: {
    actor: LogUser;
    from: {
      consent: ConsentValue | null;
      reason: string | null;
    };
    to: {
      consent: ConsentValue | null;
      reason: string | null;
    };
    user: LogUser;
  };
  [LogType.mapperConsentBeatmapsetCreated]: {
    actor: LogUser;
    beatmapset: LogBeatmapset;
    consent: boolean;
    reason: string | null;
    user: LogUser;
  };
  [LogType.mapperConsentBeatmapsetDeleted]: {
    actor: LogUser;
    beatmapset: LogBeatmapset;
    user: LogUser;
  } & (
    | {
        consent: boolean;
        reason: string | null;
      }
    | {
        // deprecated
        consent: undefined;
        reason: undefined;
      }
  );
  [LogType.mapperConsentBeatmapsetUpdated]: {
    actor: LogUser;
    beatmapset: LogBeatmapset;
    from: {
      consent: boolean;
      reason: string | null;
    };
    to: {
      consent: boolean;
      reason: string | null;
    };
    user: LogUser;
  };
  [LogType.settingUpdated]: { actor: LogUser; setting: string };
  [LogType.extraTokenCreated]: { scopes: string[]; user: LogUser };
  [LogType.extraTokenDeleted]: {
    actor: LogUser | undefined;
    scopes: string[] | undefined; // undefined is deprecated
    user: LogUser;
  };
  [LogType.pollCreated]: {
    actor: LogUser;
    beatmapset: LogBeatmapset;
    gameMode: GameMode;
    poll: Pick<Poll, 'id' | 'topic_id'>;
    round: Pick<Round, 'id' | 'name'>;
  };
  [LogType.pollUpdated]: {
    actor: LogUser;
    beatmapset: LogBeatmapset;
    gameMode: GameMode;
    poll: Pick<Poll, 'id' | 'topic_id'>;
    round: Pick<Round, 'id' | 'name'>;
  };
  [LogType.submissionDeleted]: {
    actor: LogUser;
    beatmapset: LogBeatmapset;
    submission: LogSubmission;
    user: LogUser | undefined;
  };
  [LogType.reviewCreated]: {
    beatmapset: LogBeatmapset;
    review: LogReview;
    user: LogUser;
  };
  [LogType.reviewDeleted]: {
    actor: LogUser;
    beatmapset: LogBeatmapset;
    review: LogReview;
    user: LogUser;
  };
  [LogType.reviewUpdated]: {
    beatmapset: LogBeatmapset;
    from: LogReview;
    to: LogReview;
    user: LogUser;
  };
  [LogType.beatmapsetCreated]: { beatmapset: LogBeatmapset };
  [LogType.beatmapsetDeleted]: {
    actor: LogUser;
    beatmapset: LogBeatmapset;
  };
  [LogType.beatmapsetSoftDeleted]: { beatmapset: LogBeatmapset };
  [LogType.apiUpdateForced]: {
    actor: LogUser;
    objectId: number;
    objectType: string;
  };
}

export function dbLog<T extends LogType>(
  type: T,
  values: LogValues[T],
  connection?: MysqlConnectionType,
): Promise<{ insertId: number }> {
  return (connection ?? db).query('INSERT INTO logs SET ?', [
    {
      created_at: new Date(),
      type,
      values: values == null ? null : JSON.stringify(values),
    },
  ]);
}

export function dbLogBeatmapset(beatmapset: LogBeatmapset): LogBeatmapset {
  return pick(beatmapset, ['artist', 'id', 'title']);
}

export function dbLogReview(review: LogReview): LogReview {
  return pick(review, ['game_mode', 'id', 'reason', 'score']);
}

export function dbLogSubmission(submission: LogSubmission): LogSubmission {
  return pick(submission, ['game_mode', 'id', 'reason']);
}

export function dbLogUser(user: LogUser): LogUser {
  return pick(user, ['banned', 'country', 'id', 'name']);
}

export function systemLog(message: unknown, level: SyslogLevel): void {
  if (config.syslogLevelPrefix) {
    if (typeof message !== 'string') {
      message = inspect(message, { depth: null });
    }

    message = (message as string)
      .trim()
      .split('\n')
      .map((line) => `<${level}>${line}`)
      .join('\n');
  }

  if (level <= SyslogLevel.warning) {
    console.error(message);
  } else {
    console.log(message);
  }
}
