const qs = require('querystring');
const superagent = require('superagent');
const config = require('./config.json');
const db = require('./db');

const baseUrl = 'https://osu.ppy.sh';
const apiBaseUrl = `${baseUrl}/api/v2`;
const apiScopes = 'identify public';

function authRedirectUrl(authState) {
  return `${baseUrl}/oauth/authorize?` + qs.stringify({
    client_id: config.osuApiClientId,
    redirect_uri: config.osuApiClientRedirect,
    response_type: 'code',
    scope: apiScopes,
    state: authState,
  });
}

function sanitizeAvatarUrl(url) {
  return url.startsWith('/')
    ? baseUrl + url
    : url;
}

function serializeTokenResponse(response) {
  if (response.body.token_type !== 'Bearer')
    throw 'Unexpected token type from osu! API';

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
  async getToken(authorizationCode) {
    const tokenInfo = serializeTokenResponse(
      await superagent
        .post(`${baseUrl}/oauth/token`)
        .type('form')
        .send({
          client_id: config.osuApiClientId,
          client_secret: config.osuApiClientSecret,
          code: authorizationCode,
          grant_type: 'authorization_code',
          redirect_uri: config.osuApiClientRedirect,
        })
    );

    this._assignTokenInfo(tokenInfo);
    return tokenInfo;
  }

  async tryRefreshToken() {
    if (Date.now() >= this.#tokenExpiresAt - 60000) {
      const tokenInfo = serializeTokenResponse(
        await superagent
          .post(`${baseUrl}/oauth/token`)
          .type('form')
          .send({
            client_id: config.osuApiClientId,
            client_secret: config.osuApiClientSecret,
            grant_type: 'refresh_token',
            refresh_token: this.#refreshToken,
            scope: apiScopes,
          })
      );

      this._assignTokenInfo(tokenInfo);
      return tokenInfo;
    }
  }
  //#endregion

  //#region API requests
  async revokeToken() {
    await this.#apiAgent
      .delete(`${apiBaseUrl}/oauth/tokens/current`);
  }

  async _getBeatmapset(beatmapsetId) {
    const response = await this.#apiAgent
      .get(`${apiBaseUrl}/beatmapsets/${beatmapsetId}`)

    return response.body;
  }

  async _getUser(userId) {
    const response = await this.#apiAgent
      .get(apiBaseUrl + (userId ? `/users/${userId}` : '/me'))

    return response.body;
  }
  //#endregion

  //#region Application requests
  async createOrRefreshBeatmapset(beatmapsetId, creatorGameMode) {
    const beatmapset = await this._getBeatmapset(beatmapsetId);
    await this.createOrRefreshUser(beatmapset.user_id);

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

    await db.query(`
      INSERT INTO beatmapsets SET ?
      ON DUPLICATE KEY UPDATE ?
    `, [
      dbFieldsWithPK,
      dbFields,
    ]);

    if (creatorGameMode != null) {
      try {
        await db.query('INSERT INTO beatmapset_creators SET ?', {
          beatmapset_id: beatmapset.id,
          creator_id: beatmapset.user_id,
          game_mode: creatorGameMode,
        });
      } catch {}
    }

    for (const beatmap of beatmapset.beatmaps) {
      const dbFields = {
        beatmapset_id: beatmap.beatmapset_id,
        bpm: beatmap.bpm.toFixed(2),
        deleted_at: beatmap.deleted_at == null ? null : new Date(beatmap.deleted_at),
        game_mode: beatmap.mode_int,
        key_count: beatmap.mode_int === 3 ? parseInt(beatmap.cs) : null,
        play_count: beatmap.playcount,
        ranked_status: beatmap.ranked,
        star_rating: beatmap.difficulty_rating.toFixed(2),
        version: beatmap.version,
      };
      const dbFieldsWithPK = { ...dbFields, id: beatmap.id };

      // TODO: Can't insert multiple using this syntax...
      await db.query(`
        INSERT INTO beatmaps SET ?
        ON DUPLICATE KEY UPDATE ?
      `, [
        dbFieldsWithPK,
        dbFields,
      ]);
    }

    return {
      ...dbFieldsWithPK,
      game_modes: new Set(beatmapset.beatmaps.map((beatmap) => beatmap.mode_int));
    };
  }

  async createOrRefreshUser(userId) {
    const user = await this._getUser(userId);

    const dbFields = {
      api_fetched_at: new Date(),
      avatar_url: sanitizeAvatarUrl(user.avatar_url),
      banned: false,
      country: user.country_code,
      name: user.username,
    };
    const dbFieldsWithPK = { ...dbFields, id: user.id };

    await db.query(`
      INSERT INTO users SET ?
      ON DUPLICATE KEY UPDATE ?
    `, [
      dbFieldsWithPK,
      dbFields,
    ]);

    return dbFieldsWithPK;
  }
  //#endregion
}

module.exports = {
  authRedirectUrl,
  Osu,
};
