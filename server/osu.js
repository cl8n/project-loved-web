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
async function createOrRefreshBeatmapset(token, beatmapsetId) {
  const beatmapsetInfo = await getBeatmapset(token, beatmapsetId);

  console.log(beatmapsetInfo);
  // TODO

  /*

  const dbFields = {
    api_fetched_at: new Date(),
    artist: ,
    created_at: ,
    creator_id: ,
    creator_name: ,
    favorite_count: ,
    play_count: ,
    ranked_status: ,
    submitted_at: ,
    title: ,
    updated_at: ,
  };
  const dbFieldsWithPK = { ...dbFields, id: beatmapsetInfo.id };

  await db.query(`
    INSERT INTO beatmapsets SET ?
    ON DUPLICATE KEY UPDATE ?
  `, [
    dbFieldsWithPK,
    dbFields,
  ]);



  return dbFieldsWithPK;
  */
}

async function createOrRefreshUser(token, userId) {
  const userInfo = await getUser(token, userId);

  const dbFields = {
    api_fetched_at: new Date(),
    avatar_url: sanitizeAvatarUrl(userInfo.avatar_url),
    banned: false,
    country: userInfo.country_code,
    name: userInfo.username,
  };
  const dbFieldsWithPK = { ...dbFields, id: userInfo.id };

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
