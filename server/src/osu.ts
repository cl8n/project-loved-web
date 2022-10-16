import { randomBytes } from 'crypto';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import type {
  Beatmap,
  Beatmapset,
  Poll,
  Round,
  RoundGameMode,
  TokenInfo,
  User,
} from 'loved-bridge/tables';
import { LogType } from 'loved-bridge/tables';
import qs from 'querystring';
import type { Request, Response, SuperAgentStatic } from 'superagent';
import superagent from 'superagent';
import config from './config.js';
import db from './db.js';
import { pick } from './helpers.js';
import Limiter from './Limiter.js';
import { dbLog, systemLog } from './log.js';
import { isResponseError } from './type-guards.js';

const apiBaseUrl = `${config.osuBaseUrl}/api/v2`;
const defaultApiScopes: OsuApiScopes = ['identify', 'public'];
const retainApiObjectsFor = 2419200000; // 28 days
const refreshTokenThreshold = 3600000; // 1 hour

function sanitizeAvatarUrl(url: string): string {
  return url.startsWith('/') ? config.osuBaseUrlExternal + url : url;
}

function serializeTokenResponse(response: Response, scopes: OsuApiScopes): TokenInfo {
  if (response.body.token_type !== 'Bearer') {
    throw 'Unexpected token type from osu! API';
  }

  return {
    accessToken: response.body.access_token,
    refreshToken: response.body.refresh_token,
    scopes,
    tokenExpiresAt: Date.now() + 1000 * response.body.expires_in,
  };
}

export function redirectToAuth(
  request: ExpressRequest,
  response: ExpressResponse,
  scopes: OsuApiScopes,
): void {
  request.session.authState = Buffer.concat([
    randomBytes(8),
    Buffer.from(JSON.stringify(scopes)),
  ]).toString('base64url');
  request.session.authBackUrl =
    typeof request.query.back === 'string' ? request.query.back : request.get('Referrer');

  response.redirect(
    `${config.osuBaseUrlExternal}/oauth/authorize?` +
      qs.stringify({
        client_id: config.osuClientId,
        redirect_uri: config.osuClientRedirect,
        response_type: 'code',
        scope: scopes.join(' '),
        state: request.session.authState,
      }),
  );
}

export class Osu {
  #apiAgent!: SuperAgentStatic & Request;
  #limiter: Limiter;
  #refreshToken!: string;
  #scopes!: OsuApiScopes;
  #tokenExpiresAt!: number;

  constructor(tokenInfo?: TokenInfo) {
    this.#assignTokenInfo(tokenInfo);
    this.#limiter = new Limiter(1000);
  }

  #assignTokenInfo(tokenInfo: TokenInfo | undefined): void {
    if (tokenInfo != null) {
      this.#apiAgent = superagent.agent().auth(tokenInfo.accessToken, { type: 'bearer' });
      this.#refreshToken = tokenInfo.refreshToken;
      this.#scopes = tokenInfo.scopes ?? defaultApiScopes;
      this.#tokenExpiresAt = tokenInfo.tokenExpiresAt;
    }
  }

  //#region Initializers
  async getClientCredentialsToken(): Promise<TokenInfo> {
    const tokenInfo = serializeTokenResponse(
      await superagent.post(`${config.osuBaseUrl}/oauth/token`).type('form').send({
        client_id: config.osuClientId,
        client_secret: config.osuClientSecret,
        grant_type: 'client_credentials',
        scope: 'public',
      }),
      ['public'],
    );

    this.#assignTokenInfo(tokenInfo);
    return tokenInfo;
  }

  async getToken(authorizationCode: string, scopes: OsuApiScopes): Promise<TokenInfo> {
    const tokenInfo = serializeTokenResponse(
      await superagent.post(`${config.osuBaseUrl}/oauth/token`).type('form').send({
        client_id: config.osuClientId,
        client_secret: config.osuClientSecret,
        code: authorizationCode,
        grant_type: 'authorization_code',
        redirect_uri: config.osuClientRedirect,
      }),
      scopes,
    );

    this.#assignTokenInfo(tokenInfo);
    return tokenInfo;
  }

  /**
   * If the access token is close to expiring, refresh the token pair. In practice, access tokens
   * expire on the scale of days, while refresh tokens expire on the scale of months.
   *
   * @param threshold When the token will be considered close to expiring, in milliseconds before
   *                  the token's expiration time. Defaults to 1 hour.
   * @returns The new token, if it was refreshed.
   */
  async tryRefreshToken(threshold?: number): Promise<TokenInfo | void> {
    if (Date.now() >= this.#tokenExpiresAt - (threshold ?? refreshTokenThreshold)) {
      const tokenInfo = serializeTokenResponse(
        await superagent
          .post(`${config.osuBaseUrl}/oauth/token`)
          .type('form')
          .send({
            client_id: config.osuClientId,
            client_secret: config.osuClientSecret,
            grant_type: 'refresh_token',
            refresh_token: this.#refreshToken,
            scope: this.#scopes.join(' '),
          }),
        this.#scopes,
      );

      this.#assignTokenInfo(tokenInfo);
      return tokenInfo;
    }
  }
  //#endregion

  //#region API requests
  async revokeToken(): Promise<void> {
    await this.#limiter.run(() => this.#apiAgent.delete(`${apiBaseUrl}/oauth/tokens/current`));
  }

  createForumTopic(
    forumId: number,
    title: string,
    body: string,
    options?: {
      coverId?: number;
      poll?: {
        hideResults?: boolean;
        lengthDays?: number;
        maxOptions?: number;
        options: string[];
        title: string;
        voteChangeAllowed?: boolean;
      };
    },
  ): Promise<{ post: OsuApiForumPost; topic: OsuApiForumTopic } | null> {
    const requestBody: Record<string, unknown> = {
      forum_id: forumId,
      title,
      body,
      cover_id: options?.coverId,
    };

    if (options?.poll != null) {
      requestBody.with_poll = true;
      requestBody.forum_topic_poll = {
        hide_results: options.poll.hideResults,
        length_days: options.poll.lengthDays,
        max_options: options.poll.maxOptions,
        options: options.poll.options.join('\r\n'),
        title: options.poll.title,
        vote_change: options.poll.voteChangeAllowed,
      };
    }

    return this.#limiter
      .run(() => this.#apiAgent.post(`${apiBaseUrl}/forums/topics`).send(requestBody))
      .then((response) => response.body)
      .catch((error) => {
        if (isResponseError(error) && error.status === 403) {
          return null;
        }

        throw error;
      });
  }

  createForumTopicReply(topicId: number, body: string): Promise<OsuApiForumPost | null> {
    return this.#limiter
      .run(() => this.#apiAgent.post(`${apiBaseUrl}/forums/topics/${topicId}/reply`).send({ body }))
      .then((response) => response.body)
      .catch((error) => {
        if (isResponseError(error) && (error.status === 403 || error.status === 404)) {
          return null;
        }

        throw error;
      });
  }

  getForumTopic(topicId: number): Promise<{
    posts: OsuApiForumPost[];
    topic: OsuApiForumTopic;
  } | null> {
    return this.#limiter
      .run(() => this.#apiAgent.get(`${apiBaseUrl}/forums/topics/${topicId}`))
      .then((response) => response.body)
      .catch((error) => {
        if (isResponseError(error) && (error.status === 403 || error.status === 404)) {
          return null;
        }

        throw error;
      });
  }

  updateForumPost(postId: number, body: string): Promise<OsuApiForumPost | null> {
    return this.#limiter
      .run(() => this.#apiAgent.put(`${apiBaseUrl}/forums/posts/${postId}`).send({ body }))
      .then((response) => response.body)
      .catch((error) => {
        if (isResponseError(error) && (error.status === 403 || error.status === 404)) {
          return null;
        }

        throw error;
      });
  }

  #getBeatmapset(beatmapsetId: number): Promise<OsuApiBeatmapset | null> {
    return this.#limiter
      .run(() => this.#apiAgent.get(`${apiBaseUrl}/beatmapsets/${beatmapsetId}`))
      .then((response) => response.body)
      .catch((error) => {
        if (isResponseError(error) && error.status === 404) {
          return null;
        }

        throw error;
      });
  }

  #getUser(userIdOrName: number | string | undefined, byName: boolean): Promise<OsuApiUser | null> {
    return this.#limiter
      .run(() =>
        userIdOrName == null
          ? this.#apiAgent.get(`${apiBaseUrl}/me`)
          : this.#apiAgent
              .get(`${apiBaseUrl}/users/${userIdOrName}`)
              .query({ key: byName ? 'username' : 'id' }),
      )
      .then((response) => response.body)
      .catch((error) => {
        if (isResponseError(error) && error.status === 404) {
          return null;
        }

        throw error;
      });
  }
  //#endregion

  //#region Application requests
  async createOrRefreshBeatmapset(
    beatmapsetId: number,
    forceUpdate = false,
  ): Promise<(Beatmapset & { game_modes: Set<GameMode> }) | null> {
    let currentInDb: Beatmapset | null | undefined;

    if (!forceUpdate) {
      currentInDb = await db.queryOne<Beatmapset>('SELECT * FROM beatmapsets WHERE id = ?', [
        beatmapsetId,
      ]);

      if (
        currentInDb != null &&
        (currentInDb.deleted_at != null ||
          Date.now() <= currentInDb.api_fetched_at.getTime() + retainApiObjectsFor)
      ) {
        const beatmaps = await db.query<Pick<Beatmap, 'game_mode'>>(
          'SELECT game_mode FROM beatmaps WHERE beatmapset_id = ? AND deleted_at IS NULL',
          [beatmapsetId],
        );

        return {
          ...currentInDb,
          game_modes: new Set(beatmaps.map((beatmap) => beatmap.game_mode)),
        };
      }
    }

    const beatmapset = await this.#getBeatmapset(beatmapsetId);

    if (beatmapset == null) {
      if (forceUpdate) {
        currentInDb = await db.queryOne<Beatmapset>('SELECT * FROM beatmapsets WHERE id = ?', [
          beatmapsetId,
        ]);
      }

      if (currentInDb == null) {
        return null;
      }

      const now = new Date();
      await db.transact(async (connection) => {
        await connection.query(
          'UPDATE beatmaps SET ? WHERE beatmapset_id = ? AND deleted_at IS NULL',
          [{ deleted_at: now }, beatmapsetId],
        );
        await connection.query('UPDATE beatmapsets SET ? WHERE id = ? AND deleted_at IS NULL', [
          { api_fetched_at: now, deleted_at: now },
          beatmapsetId,
        ]);
      });

      return null;
    }

    await Promise.all(
      [
        ...new Set([beatmapset.user_id, ...beatmapset.beatmaps.map((beatmap) => beatmap.user_id)]),
      ].map((creatorId) => this.createOrRefreshUser(creatorId, { forceUpdate, storeBanned: true })),
    );

    const dbFields = {
      api_fetched_at: new Date(),
      artist: beatmapset.artist,
      creator_id: beatmapset.user_id,
      creator_name: beatmapset.creator,
      deleted_at: null,
      favorite_count: beatmapset.favourite_count,
      play_count: beatmapset.play_count,
      ranked_status: beatmapset.ranked,
      submitted_at: new Date(beatmapset.submitted_date),
      updated_at: new Date(beatmapset.last_updated),
      title: beatmapset.title,
    };
    const dbFieldsWithPK = { ...dbFields, id: beatmapset.id };
    const gameModes = new Set<number>();

    await db.transact(async (connection) => {
      await connection.query(
        `
          INSERT INTO beatmapsets SET ?
          ON DUPLICATE KEY UPDATE ?
        `,
        [dbFieldsWithPK, dbFields],
      );

      for (const beatmap of beatmapset.beatmaps) {
        if (beatmap.bpm == null) {
          systemLog(
            `Beatmap #${beatmap.id} has ${beatmap.bpm} BPM, setting to 0`,
            SyslogLevel.warning,
          );
          beatmap.bpm = 0;
        }

        gameModes.add(beatmap.mode_int);

        const dbFields = {
          beatmapset_id: beatmap.beatmapset_id,
          bpm: beatmap.bpm >= 9999 ? '9999.99' : beatmap.bpm.toFixed(2),
          creator_id: beatmap.user_id,
          deleted_at: beatmap.deleted_at == null ? null : new Date(beatmap.deleted_at),
          game_mode: beatmap.mode_int,
          key_count: beatmap.mode_int === GameMode.mania ? Math.round(beatmap.cs) : null,
          play_count: beatmap.playcount,
          ranked_status: beatmap.ranked,
          star_rating:
            beatmap.difficulty_rating >= 9999 ? '9999.99' : beatmap.difficulty_rating.toFixed(2),
          total_length: beatmap.total_length,
          version: beatmap.version,
        };
        const dbFieldsWithPK = { ...dbFields, id: beatmap.id };

        // TODO: Can't insert multiple using this syntax...
        await connection.query(
          `
            INSERT INTO beatmaps SET ?
            ON DUPLICATE KEY UPDATE ?
          `,
          [dbFieldsWithPK, dbFields],
        );
      }

      // TODO: If force updating beatmapset, also force update all exisitng beatmapset_creators
      //       who aren't the mapset host

      // If this map is now Loved, check if any of the incomplete rounds it
      // belongs to now only contain maps that are Loved or failed voting. If so,
      // mark the round as "done".
      if (dbFields.ranked_status === RankedStatus.loved) {
        const incompleteRoundsWithBeatmapset = await connection.query<Pick<Round, 'id'>>(
          `
            SELECT rounds.id
            FROM rounds
            INNER JOIN polls
              ON rounds.id = polls.round_id
            WHERE rounds.done = 0
              AND polls.result_no IS NOT NULL
              AND polls.result_yes IS NOT NULL
              AND polls.beatmapset_id = ?
          `,
          [beatmapset.id],
        );
        const roundIdsToComplete: number[] = [];

        for (const round of incompleteRoundsWithBeatmapset) {
          const beatmapsets = await connection.queryWithGroups<
            Pick<Beatmapset, 'ranked_status'> & {
              poll: (Poll & Pick<RoundGameMode, 'voting_threshold'>) | null;
            }
          >(
            `
              SELECT beatmapsets.ranked_status, polls:poll,
                round_game_modes.voting_threshold AS 'poll:voting_threshold'
              FROM nominations
              INNER JOIN beatmapsets
                ON nominations.beatmapset_id = beatmapsets.id
              LEFT JOIN polls
                ON nominations.round_id = polls.round_id
                AND nominations.game_mode = polls.game_mode
                AND nominations.beatmapset_id = polls.beatmapset_id
              INNER JOIN round_game_modes
                ON nominations.round_id = round_game_modes.round_id
                AND nominations.game_mode = round_game_modes.game_mode
              WHERE nominations.round_id = ?
            `,
            [round.id],
          );
          let roundDone = true;

          for (const beatmapset of beatmapsets) {
            if (beatmapset.ranked_status === RankedStatus.loved) {
              continue;
            }

            const result = beatmapset.poll;

            if (
              result == null ||
              result.result_no == null ||
              result.result_yes == null ||
              result.voting_threshold == null ||
              result.result_yes / (result.result_no + result.result_yes) >= result.voting_threshold
            ) {
              roundDone = false;
              break;
            }
          }

          if (roundDone) {
            roundIdsToComplete.push(round.id);
          }
        }

        if (roundIdsToComplete.length > 0) {
          await connection.query('UPDATE rounds SET done = 1 WHERE id IN (?)', [
            roundIdsToComplete,
          ]);
        }
      }
    });

    return {
      ...dbFieldsWithPK,
      game_modes: new Set(beatmapset.beatmaps.map((beatmap) => beatmap.mode_int)),
    };
  }

  async createOrRefreshUser(): Promise<User | null>;
  async createOrRefreshUser(
    userId: number,
    options: { byName?: false; forceUpdate?: boolean; storeBanned: true },
  ): Promise<User>;
  async createOrRefreshUser(
    userId: number,
    options?: { byName?: false; forceUpdate?: boolean; storeBanned?: boolean },
  ): Promise<User | null>;
  async createOrRefreshUser(
    userName: string,
    options: { byName: true; forceUpdate?: boolean; storeBanned: true },
  ): Promise<User>;
  async createOrRefreshUser(
    userName: string,
    options: { byName: true; forceUpdate?: boolean; storeBanned?: boolean },
  ): Promise<User | null>;
  async createOrRefreshUser(
    userIdOrName?: number | string,
    options?: { byName?: boolean; forceUpdate?: boolean; storeBanned?: boolean },
  ): Promise<User | null> {
    const { byName = false, forceUpdate = false, storeBanned = false } = options ?? {};
    let currentInDb: User | null | undefined;

    if (userIdOrName != null) {
      currentInDb = await db.queryOne<User>('SELECT * FROM users WHERE ?? = ?', [
        byName ? 'name' : 'id',
        userIdOrName,
      ]);

      if (
        !forceUpdate &&
        currentInDb != null &&
        Date.now() <= currentInDb.api_fetched_at.getTime() + retainApiObjectsFor
      ) {
        return currentInDb;
      }
    }

    const user = await this.#getUser(userIdOrName, byName);

    if (currentInDb == null && user != null) {
      currentInDb = await db.queryOne<User>('SELECT * FROM users WHERE id = ?', [user.id]);
    }

    if (user == null) {
      if (userIdOrName == null) {
        return null;
      }

      if (!storeBanned) {
        return null;
      }
    }

    return await db.transact(async (connection) => {
      let dbFields: Omit<User, 'id'>;
      let dbFieldsWithPK: User;

      if (user == null) {
        if (currentInDb != null) {
          dbFieldsWithPK = { ...currentInDb, api_fetched_at: new Date(), banned: true };
          dbFields = { ...dbFieldsWithPK };
          delete (dbFields as { id?: number }).id;
        } else {
          dbFields = {
            api_fetched_at: new Date(),
            avatar_url: sanitizeAvatarUrl('/images/layout/avatar-guest.png'),
            banned: true,
            country: '__',
          } as Omit<User, 'id'>;

          if (byName) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const nextBannedId = (await connection.queryOne<{ next_id: number }>(`
              SELECT IF(COUNT(*) > 0, MAX(id) + 1, 4294000000) AS next_id
              FROM users
              WHERE id >= 4294000000
            `))!.next_id;

            dbFields.name = userIdOrName as string;
            dbFieldsWithPK = { ...dbFields, id: nextBannedId };
          } else {
            dbFields.name = 'Banned user';
            dbFieldsWithPK = { ...dbFields, id: userIdOrName as number };
          }
        }
      } else {
        dbFields = {
          api_fetched_at: new Date(),
          avatar_url: sanitizeAvatarUrl(user.avatar_url),
          banned: false,
          country: user.country_code ?? '__',
          name: user.username,
        };
        dbFieldsWithPK = { ...dbFields, id: user.id };

        if (user.previous_usernames.length > 0) {
          await connection.query('INSERT IGNORE INTO user_names (user_id, name) VALUES ?', [
            user.previous_usernames.map((name) => [user.id, name]),
          ]);
        }
      }

      await connection.query(
        `
          INSERT INTO users SET ?
          ON DUPLICATE KEY UPDATE ?
        `,
        [dbFieldsWithPK, dbFields],
      );

      const logUser = pick(dbFieldsWithPK, ['banned', 'country', 'id', 'name']);

      if (currentInDb == null) {
        await dbLog(LogType.userCreated, { user: logUser }, connection);
      } else if (
        currentInDb.banned !== logUser.banned ||
        currentInDb.country !== logUser.country ||
        currentInDb.name !== logUser.name
      ) {
        await dbLog(
          LogType.userUpdated,
          {
            from: {
              banned: currentInDb.banned,
              country: currentInDb.country,
              id: currentInDb.id,
              name: currentInDb.name,
            },
            to: logUser,
          },
          connection,
        );
      }

      return dbFieldsWithPK;
    });
  }
  //#endregion
}
