const qs = require('querystring');
const superagent = require('superagent');
const config = require('./config.json');
const db = require('./db');

// TODO: should rly be an object to persist token...

//#region authorization
const apiBaseUrl = 'https://osu.ppy.sh/api/v2/';
const apiScopes = 'identify public';

function sanitizeAvatarUrl(url) {
  return url.startsWith('/')
    ? `https://osu.ppy.sh${url}`
    : url;
}

function serializeTokenResponse(responseBody) {
  if (responseBody.token_type !== 'Bearer')
    throw 'Unexpected token type from osu! API';

  return {
    accessToken: responseBody.access_token,
    refreshToken: responseBody.refresh_token,
    tokenExpiresAt: Date.now() + 1000 * responseBody.expires_in,
  };
}

function authRedirectUrl(authState) {
  return 'https://osu.ppy.sh/oauth/authorize?' + qs.stringify({
    client_id: config.osuApiClientId,
    redirect_uri: config.osuApiClientRedirect,
    response_type: 'code',
    scope: apiScopes,
    state: authState,
  });
}

async function fetchToken(authorizationCode) {
  const response = await superagent
    .post('https://osu.ppy.sh/oauth/token')
    .type('form')
    .send({
      client_id: config.osuApiClientId,
      client_secret: config.osuApiClientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
      redirect_uri: config.osuApiClientRedirect,
    });

  return serializeTokenResponse(response.body);
}

async function refreshToken(refreshToken) {
  const response = await superagent
    .post('https://osu.ppy.sh/oauth/token')
    .type('form')
    .send({
      client_id: config.osuApiClientId,
      client_secret: config.osuApiClientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: apiScopes,
    });

  return serializeTokenResponse(response.body);
}

async function revokeToken(token) {
  await superagent
    .delete(`${apiBaseUrl}oauth/tokens/current`)
    .auth(token, { type: 'bearer' });
}
//#endregion

//#region requests
async function getBeatmapset(token, beatmapsetId) {
  const response = await superagent
    .get(`${apiBaseUrl}beatmapsets/${beatmapsetId}`)
    .auth(token, { type: 'bearer' });

  return response.body;
}

async function getUser(token, userId) {
  const response = await superagent
    .get(apiBaseUrl + (userId ? `users/${userId}` : 'me'))
    .auth(token, { type: 'bearer' });

  return response.body;
}
//#endregion

//#region models
async function createOrRefreshBeatmapset(token, beatmapsetId, creatorGameMode) {
  const beatmapset = await getBeatmapset(token, beatmapsetId);
  await createOrRefreshUser(token, beatmapset.user_id);

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

  return dbFieldsWithPK;
}

async function createOrRefreshUser(token, userId) {
  const user = await getUser(token, userId);

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

module.exports = {
  authRedirectUrl,
  fetchToken,
  refreshToken,
  revokeToken,
  createOrRefreshBeatmapset,
  createOrRefreshUser,
};
