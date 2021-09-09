const qs = require('querystring');
const superagent = require('superagent');
const db = require('./db');

const baseUrl = 'https://osu.ppy.sh';
const apiBaseUrl = `${baseUrl}/api/v2`;
const apiScopes = 'identify public';
const retainApiObjectsFor = 2419200000; // 28 days
const refreshTokenThreshold = 3600000; // 1 hour

function authRedirectUrl(authState) {
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

function sanitizeAvatarUrl(url) {
  return url.startsWith('/') ? baseUrl + url : url;
}

function serializeTokenResponse(response) {
  if (response.body.token_type !== 'Bearer') {
    throw 'Unexpected token type from osu! API';
  }

  return {
    accessToken: response.body.access_token,
    refreshToken: response.body.refresh_token,
    tokenExpiresAt: Date.now() + 1000 * response.body.expires_in,
  };
}

class Osu {
  #apiAgent;
  #refreshToken;
  #tokenExpiresAt;

  constructor(tokenInfo) {
    this._assignTokenInfo(tokenInfo);
  }

  _assignTokenInfo(tokenInfo) {
    if (tokenInfo != null) {
      this.#apiAgent = superagent.agent().auth(tokenInfo.accessToken, { type: 'bearer' });
      this.#refreshToken = tokenInfo.refreshToken;
      this.#tokenExpiresAt = tokenInfo.tokenExpiresAt;
    }
  }

  //#region Initializers
  async getClientCredentialsToken() {
    const tokenInfo = serializeTokenResponse(
      await superagent.post(`${baseUrl}/oauth/token`).type('form').send({
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'public',
      }),
    );

    this._assignTokenInfo(tokenInfo);
    return tokenInfo;
  }

  async getToken(authorizationCode) {
    const tokenInfo = serializeTokenResponse(
      await superagent.post(`${baseUrl}/oauth/token`).type('form').send({
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRET,
        code: authorizationCode,
        grant_type: 'authorization_code',
        redirect_uri: process.env.OSU_CLIENT_REDIRECT,
      }),
    );

    this._assignTokenInfo(tokenInfo);
    return tokenInfo;
  }

  async tryRefreshToken() {
    if (Date.now() >= this.#tokenExpiresAt - refreshTokenThreshold) {
      const tokenInfo = serializeTokenResponse(
        await superagent.post(`${baseUrl}/oauth/token`).type('form').send({
          client_id: process.env.OSU_CLIENT_ID,
          client_secret: process.env.OSU_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: this.#refreshToken,
          scope: apiScopes,
        }),
      );

      this._assignTokenInfo(tokenInfo);
      return tokenInfo;
    }
  }
  //#endregion

  //#region API requests
  async revokeToken() {
    await this.#apiAgent.delete(`${apiBaseUrl}/oauth/tokens/current`);
  }

  async _getBeatmapset(beatmapsetId) {
    const response = await this.#apiAgent.get(`${apiBaseUrl}/beatmapsets/${beatmapsetId}`);

    return response.body;
  }

  async _getUser(userIdOrName, byName) {
    const request =
      userIdOrName == null
        ? this.#apiAgent.get(`${apiBaseUrl}/me`)
        : this.#apiAgent
            .get(`${apiBaseUrl}/users/${userIdOrName}`)
            .query({ key: byName ? 'username' : 'id' });
    const response = await request;

    return response.body;
  }
  //#endregion

  //#region Application requests
  async createOrRefreshBeatmapset(beatmapsetId, forceUpdate = false) {
    if (!forceUpdate) {
      const currentInDb = await db.queryOne('SELECT * FROM beatmapsets WHERE id = ?', beatmapsetId);

      if (
        currentInDb != null &&
        Date.now() <= currentInDb.api_fetched_at.getTime() + retainApiObjectsFor
      ) {
        const beatmaps = await db.query(
          'SELECT game_mode FROM beatmaps WHERE beatmapset_id = ?',
          beatmapsetId,
        );

        return {
          ...currentInDb,
          game_modes: new Set(beatmaps.map((beatmap) => beatmap.game_mode)),
        };
      }
    }

    let beatmapset;
    try {
      beatmapset = await this._getBeatmapset(beatmapsetId);
    } catch {
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
      favorite_count: beatmapset.favourite_count,
      play_count: beatmapset.play_count,
      ranked_status: beatmapset.ranked,
      submitted_at: new Date(beatmapset.submitted_date),
      updated_at: new Date(beatmapset.last_updated),
      title: beatmapset.title,
    };
    const dbFieldsWithPK = { ...dbFields, id: beatmapset.id };
    const gameModes = new Set();

    await db.transact(async (connection) => {
      await connection.query(
        `
          INSERT INTO beatmapsets SET ?
          ON DUPLICATE KEY UPDATE ?
        `,
        [dbFieldsWithPK, dbFields],
      );

      for (const beatmap of beatmapset.beatmaps) {
        gameModes.add(beatmap.mode_int);

        const dbFields = {
          beatmapset_id: beatmap.beatmapset_id,
          bpm: beatmap.bpm >= 9999 ? '9999.99' : beatmap.bpm.toFixed(2),
          deleted_at: beatmap.deleted_at == null ? null : new Date(beatmap.deleted_at),
          game_mode: beatmap.mode_int,
          key_count: beatmap.mode_int === 3 ? parseInt(beatmap.cs) : null,
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
        await connection.query(
          `
            SELECT game_mode
            FROM beatmapset_creators
            WHERE beatmapset_id = ?
            GROUP BY game_mode
          `,
          beatmapset.id,
        )
      ).map((gameMode) => gameMode.game_mode);
      const creatorsToInsert = [];

      for (const gameMode of gameModes) {
        if (creatorGameModes.includes(gameMode)) {
          continue;
        }

        creatorsToInsert.push([beatmapset.id, beatmapset.user_id, gameMode]);
      }

      if (creatorsToInsert.length > 0) {
        await connection.query('INSERT INTO beatmapset_creators VALUES ?', [creatorsToInsert]);
      }

      // TODO: If force updating beatmapset, also force update all exisitng beatmapset_creators
      //       who aren't the mapset host

      // If this map is now Loved, check if any of the incomplete rounds it
      // belongs to now only contain maps that are Loved or failed voting. If so,
      // mark the round as "done".
      if (dbFields.ranked_status === 4) {
        const incompleteRoundsWithBeatmapset = await connection.query(
          `
            SELECT rounds.id
            FROM rounds
            INNER JOIN nominations
              ON rounds.id = nominations.round_id
            WHERE rounds.done = 0
              AND rounds.polls_ended_at IS NOT NULL
              AND rounds.polls_ended_at < ?
              AND nominations.beatmapset_id = ?
          `,
          [new Date(), beatmapset.id],
        );
        const roundIdsToComplete = [];

        for (const round of incompleteRoundsWithBeatmapset) {
          const beatmapsets = await connection.queryWithGroups(
            `
              SELECT beatmapsets.ranked_status, poll_results:poll_result,
                round_game_modes.voting_threshold AS 'poll_result:voting_threshold'
              FROM nominations
              INNER JOIN beatmapsets
                ON nominations.beatmapset_id = beatmapsets.id
              LEFT JOIN poll_results
                ON nominations.round_id = poll_results.round
                AND nominations.game_mode = poll_results.game_mode
                AND nominations.beatmapset_id = poll_results.beatmapset_id
              INNER JOIN round_game_modes
                ON nominations.round_id = round_game_modes.round_id
                AND nominations.game_mode = round_game_modes.game_mode
              WHERE nominations.round_id = ?
            `,
            round.id,
          );
          let roundDone = true;

          for (const beatmapset of beatmapsets) {
            if (beatmapset.ranked_status === 4) {
              continue;
            }

            const result = beatmapset.poll_result;

            if (
              result == null ||
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

  async createOrRefreshUser(userIdOrName, options) {
    const { byName = false, forceUpdate = false, storeBanned = false } = options ?? {};
    let currentInDb;

    if (!forceUpdate && userIdOrName != null) {
      currentInDb = await db.queryOne('SELECT * FROM users WHERE ?? = ?', [
        byName ? 'name' : 'id',
        userIdOrName,
      ]);

      if (
        currentInDb != null &&
        Date.now() <= currentInDb.api_fetched_at.getTime() + retainApiObjectsFor
      ) {
        return currentInDb;
      }
    }

    const user = await this._getUser(userIdOrName, byName).catch(() => null);
    let dbFields;
    let dbFieldsWithPK;

    await db.transact(async (connection) => {
      if (user == null) {
        if (userIdOrName == null) {
          return null;
        }

        if (currentInDb == null) {
          currentInDb = await connection.queryOne('SELECT * FROM users WHERE ?? = ?', [
            byName ? 'name' : 'id',
            userIdOrName,
          ]);
        }

        if (currentInDb != null) {
          return currentInDb;
        }

        if (!storeBanned) {
          return null;
        }

        dbFields = {
          api_fetched_at: new Date(),
          avatar_url: sanitizeAvatarUrl('/images/layout/avatar-guest.png'),
          banned: true,
          country: '__',
        };

        if (byName) {
          const nextBannedId = (
            await connection.queryOne(`
              SELECT IF(COUNT(*) > 0, MAX(id) + 1, 4294000000) AS next_id
              FROM users
              WHERE id >= 4294000000
            `)
          ).next_id;

          dbFields.name = userIdOrName;
          dbFieldsWithPK = { ...dbFields, id: nextBannedId };
        } else {
          dbFields.name = 'Banned user';
          dbFieldsWithPK = { ...dbFields, id: userIdOrName };
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
          await connection.query('INSERT IGNORE INTO user_names (id, name) VALUES ?', [
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
    });

    return dbFieldsWithPK;
  }
  //#endregion
}

module.exports = {
  authRedirectUrl,
  Osu,
};
