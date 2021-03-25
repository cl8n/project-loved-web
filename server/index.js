#!/usr/bin/env node

const { randomBytes } = require('crypto');
const express = require('express');
const session = require('express-session');
const MysqlSessionStore = require('express-mysql-session')(session);
const config = require('./config.json');
const db = require('./db');
const { asyncHandler } = require('./express-helpers');
const { log, logTypes } = require('./log');
const { authRedirectUrl, createOrRefreshUser, fetchToken, refreshToken, revokeToken } = require('./osu');
const router = require('./router');

function destroySession(session) {
  return new Promise(function (resolve, reject) {
    session.destroy(function (error) {
      if (error != null)
        reject(error);

      resolve();
    });
  });
}

const app = express();
const sessionStore = new MysqlSessionStore({
  checkExpirationInterval: 1800000, // 30 minutes
  expiration: 604800000, // 7 days
}, db.connection);

app.get('/', function (_, response) {
  response.send('<p>This is the API for <a href="https://loved.sh">loved.sh</a>. You shouldn\'t be here!</p>');
});

app.use(session({
  cookie: {
    httpOnly: true,
    secure: true,
  },
  name: 'loved_sid',
  proxy: true,
  resave: false,
  saveUninitialized: false,
  secret: config.sessionSecret,
  store: sessionStore,
}));

app.use(express.json());

app.get('/auth/begin', function (request, response) {
  if (request.session.userId != null)
    return response.status(403).json({ error: 'Already logged in!' });

  request.session.authState = randomBytes(32).toString('hex');
  request.session.authBackUrl = request.get('Referrer');

  response.redirect(authRedirectUrl(request.session.authState));
});

app.get('/auth/callback', asyncHandler(async function (request, response) {
  if (request.query.error)
    throw request.query.error;

  if (!request.query.code)
    throw 'No authorization code received (this should never happen)';

  const backUrl = request.session.authBackUrl;
  const state = request.session.authState;
  delete request.session.authBackUrl;
  delete request.session.authState;

  if (!request.query.state || request.query.state !== state)
    throw 'Invalid state';

  const tokenInfo = await fetchToken(request.query.code);
  Object.assign(request.session, tokenInfo);

  const userInfo = await createOrRefreshUser(request.session.accessToken);
  request.session.userId = userInfo.id;

  await db.query('INSERT IGNORE INTO user_roles SET id = ?', userInfo.id);
  //await log(logTypes.analytic, '{creator} logged in', userInfo.id);

  response.redirect(backUrl || '/');
}));

app.use(asyncHandler(async function (request, response, next) {
  if (!request.session.userId)
    return response.status(401).json({ error: 'Log in first' });

  if (Date.now() >= request.session.tokenExpiresAt - 60000)
    try {
      Object.assign(request.session, await refreshToken(request.session.refreshToken));
    } catch (error) {
      await destroySession(request.session);
      throw error;
    }

  const user = await db.queryOneWithGroups(`
    SELECT users.*, user_roles:roles
    FROM users
    INNER JOIN user_roles
      ON users.id = user_roles.id
    WHERE users.id = ?
  `, request.session.userId);
  delete user.api_fetched_at;
  response.locals.user = user;

  next();
}));

app.post('/auth/bye', asyncHandler(async function (request, response) {
  await revokeToken(request.session.accessToken);
  //log(logTypes.analytic, '{creator} logged out', request.session.userId);
  await destroySession(request.session);

  response.status(204).send();
}));

app.get('/auth/remember', function (_, response) {
  response.json(response.locals.user);
});

app.use('/', router);

app.use(function (_, response) {
  response.status(404).json({ error: 'Not found' });
});

app.use(function (error, _, response, _) {
  // TODO: can probably do better than these logs
  //log(logTypes.error, `{plain}${error}`);
  console.error(error);

  response.status(500).json({ error: 'Server error' });
});

app.listen(config.port);
