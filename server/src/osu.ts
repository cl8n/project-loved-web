import qs from 'querystring';
import type { Request, Response, SuperAgentStatic } from 'superagent';
import superagent from 'superagent';
import db from './db';
import Limiter from './Limiter';
import { dbLog, systemLog } from './log';

if (
  process.env.OSU_CLIENT_ID == null ||
  process.env.OSU_CLIENT_REDIRECT == null ||
  process.env.OSU_CLIENT_SECRET == null
) {
  throw 'Invalid osu! API client config';
}

const baseUrl = 'https://osu.ppy.sh';
const apiBaseUrl = `${baseUrl}/api/v2` as const;
const apiScopes = 'identify public';
const retainApiObjectsFor = 2419200000; // 28 days
const refreshTokenThreshold = 3600000; // 1 hour

export function authRedirectUrl(authState: string): string {
  return (
    `${baseUrl}/oauth/authorize?` +
    qs.stringify({
      client_id: process.env.OSU_CLIENT_ID,
      redirect_uri: process.env.OSU_CLIENT_REDIRECT,
      response_type: 'code',
      scope: apiScopes,
      state: authState,
    })
  );
}

function sanitizeAvatarUrl(url: string): string {
  return url.startsWith('/') ? baseUrl + url : url;
}

function serializeTokenResponse(response: Response): TokenInfo {
  if (response.body.token_type !== 'Bearer') {
    throw 'Unexpected token type from osu! API';
  }

  return {
    accessToken: response.body.access_token,
    refreshToken: response.body.refresh_token,
    tokenExpiresAt: Date.now() + 1000 * response.body.expires_in,
  };
}

export class Osu {
  #apiAgent!: SuperAgentStatic & Request;
  #limiter: Limiter;
  #refreshToken!: string;
  #tokenExpiresAt!: number;

  constructor(tokenInfo?: TokenInfo) {
    this.#assignTokenInfo(tokenInfo);
    this.#limiter = new Limiter(1000);
  }

  #assignTokenInfo(tokenInfo: TokenInfo | undefined): void {
    if (tokenInfo != null) {
      this.#apiAgent = superagent.agent().auth(tokenInfo.accessToken, { type: 'bearer' });
      this.#refreshToken = tokenInfo.refreshToken;
      this.#tokenExpiresAt = tokenInfo.tokenExpiresAt;
    }
  }

  //#region Initializers
  async getClientCredentialsToken(): Promise<TokenInfo> {
    const tokenInfo = serializeTokenResponse(
      await superagent.post(`${baseUrl}/oauth/token`).type('form').send({
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'public',
      }),
    );

    this.#assignTokenInfo(tokenInfo);
    return tokenInfo;
  }

  async getToken(authorizationCode: string): Promise<TokenInfo> {
    const tokenInfo = serializeTokenResponse(
      await superagent.post(`${baseUrl}/oauth/token`).type('form').send({
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRET,
        code: authorizationCode,
        grant_type: 'authorization_code',
        redirect_uri: process.env.OSU_CLIENT_REDIRECT,
      }),
    );

    this.#assignTokenInfo(tokenInfo);
    return tokenInfo;
  }

  async tryRefreshToken(): Promise<TokenInfo | void> {
    if (Date.now() >= this.#tokenExpiresAt - refreshTokenThreshold) {
      const tokenInfo = serializeTokenResponse(
        await superagent
          .post(`${baseUrl}/oauth/token`)
          .type('form')
          .send({
            client_id: process.env.OSU_CLIENT_ID,
            client_secret: process.env.OSU_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: this.#refreshToken,
            scope: apiScopes,
          }),
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

  async getForumTopic(topicId: number): Promise<OsuApiForumTopic> {
    const response = await this.#limiter.run(() =>
      this.#apiAgent.get(`${apiBaseUrl}/forums/topics/${topicId}`),
    );

    return response.body;
  }

  async #getBeatmapset(beatmapsetId: number): Promise<OsuApiBeatmapset> {
    const response = await this.#limiter.run(() =>
      this.#apiAgent.get(`${apiBaseUrl}/beatmapsets/${beatmapsetId}`),
    );

    return response.body;
  }

  async #getUser(userIdOrName: number | string | undefined, byName: boolean): Promise<OsuApiUser> {
    const response = await this.#limiter.run(() =>
      userIdOrName == null
        ? this.#apiAgent.get(`${apiBaseUrl}/me`)
        : this.#apiAgent
            .get(`${apiBaseUrl}/users/${userIdOrName}`)
            .query({ key: byName ? 'username' : 'id' }),
    );

    return response.body;
  }
  //#endregion

  //#region Application requests
  async createOrRefreshBeatmapset(
    beatmapsetId: number,
    forceUpdate = false,
  ): Promise<(Beatmapset & { game_modes: Set<GameMode> }) | null> {
    if (!forceUpdate) {
      const currentInDb = await db.queryOne<Beatmapset>('SELECT * FROM beatmapsets WHERE id = ?', [
        beatmapsetId,
      ]);

      if (
        currentInDb != null &&
        (currentInDb.deleted_at != null ||
          Date.now() <= currentInDb.api_fetched_at.getTime() + retainApiObjectsFor)
      ) {
        const beatmaps = await db.query<Pick<Beatmap, 'game_mode'>>(
          'SELECT game_mode FROM beatmaps WHERE beatmapset_id = ?',
          [beatmapsetId],
        );

        return {
          ...currentInDb,
          game_modes: new Set(beatmaps.map((beatmap) => beatmap.game_mode)),
        };
      }
    }

    const beatmapset = await this.#getBeatmapset(beatmapsetId).catch(() => null);

    if (beatmapset == null) {
      return null;
    }

    await this.createOrRefreshUser(beatmapset.user_id, {
      forceUpdate,
      storeBanned: true,
    });

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

      const creatorGameModes = (
        await connection.query<Pick<BeatmapsetCreator, 'game_mode'>>(
          `
            SELECT game_mode
            FROM beatmapset_creators
            WHERE beatmapset_id = ?
            GROUP BY game_mode
          `,
          [beatmapset.id],
        )
      ).map((row) => row.game_mode);
      const creatorsToInsert: [number, number, GameMode][] = [];

      for (const gameMode of gameModes) {
        if (creatorGameModes.includes(gameMode)) {
          continue;
        }

        creatorsToInsert.push([beatmapset.id, beatmapset.user_id, gameMode]);
      }

      if (creatorsToInsert.length > 0) {
        await connection.query(
          'INSERT INTO beatmapset_creators (beatmapset_id, creator_id, game_mode) VALUES ?',
          [creatorsToInsert],
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
    options?: { byName?: false; forceUpdate?: boolean; storeBanned?: false },
  ): Promise<User | null>;
  async createOrRefreshUser(
    userId: number,
    options: { byName?: false; forceUpdate?: boolean; storeBanned: true },
  ): Promise<User>;
  async createOrRefreshUser(
    userName: string,
    options: { byName: true; forceUpdate?: boolean; storeBanned?: false },
  ): Promise<User | null>;
  async createOrRefreshUser(
    userName: string,
    options: { byName: true; forceUpdate?: boolean; storeBanned: true },
  ): Promise<User>;
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

    const user = await this.#getUser(userIdOrName, byName).catch(() => null);

    if (currentInDb == null && user != null) {
      currentInDb = await db.queryOne<User>('SELECT * FROM users WHERE id = ?', [user.id]);
    }

    if (user == null) {
      if (userIdOrName == null) {
        return null;
      }

      if (currentInDb != null) {
        return currentInDb;
      }

      if (!storeBanned) {
        return null;
      }
    }

    return await db.transact(async (connection) => {
      let dbFields: Omit<User, 'id'>;
      let dbFieldsWithPK: User;

      if (user == null) {
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
      } else {
        dbFields = {
          api_fetched_at: new Date(),
          avatar_url: sanitizeAvatarUrl(user.avatar_url),
          banned: false,
          country: user.country_code,
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

      const logUser = {
        country: dbFieldsWithPK.country,
        id: dbFieldsWithPK.id,
        name: dbFieldsWithPK.name,
      };

      if (currentInDb == null) {
        await dbLog(LogType.userCreated, { user: logUser }, connection);
      } else if (currentInDb.country !== logUser.country || currentInDb.name !== logUser.name) {
        await dbLog(
          LogType.userUpdated,
          {
            from: {
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
