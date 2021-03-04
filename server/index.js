const { randomBytes } = require('crypto');
const express = require('express');
const session = require('express-session');
const MysqlSessionStore = require('express-mysql-session')(session);
const config = require('./config.json');
const db = require('./db');
const { authRedirectUrl, createOrRefreshUser, fetchToken, refreshToken } = require('./osu');
const router = require('./router');

const app = express();
const sessionStore = new MysqlSessionStore({}, db.connection);

//db.connect();

app.get('', function (_, response) {
  response.send('<p>This is the API for <a href="https://loved.sh">loved.sh</a>. You shouldn\'t be here!</p>')
});

app.use(session({
  cookie: {
    path: config.sessionCookiePath,
    secure: true,
  },
  name: 'loved_sid',
  resave: false,
  saveUninitialized: false,
  secret: config.sessionSecret,
  store: sessionStore,
}));

app.use(express.json());

app.get('auth/begin', function (request, response) {
  request.session.authState = randomBytes(32).toString('hex');
  request.session.authBackUrl = request.get('Referrer');

  response.redirect(authRedirectUrl(request.session.authState));
});

app.post('auth/bye', function (request, response) {
  request.session.destroy((error) => {
    if (error)
      throw error;

    response.status(204).send();
  });
});

app.get('auth/callback', async function (request, response) {
  if (request.query.error)
    throw request.query.error;

  if (!request.query.code)
    throw 'No authorization code received (this should never happen)';

  const backUrl = request.session.authBackUrl;
  const state = request.session.authState;
  delete request.session.authBackUrl;
  delete request.session.authState;

  if (request.query.state !== state)
    throw 'Invalid state';

  const tokenInfo = await fetchToken(request.query.code);
  Object.assign(request.session, tokenInfo);

  const userInfo = await createOrRefreshUser(request.session.accessToken);
  request.session.userId = userInfo.id;

  response.redirect(backUrl || '/');
});

app.use(async function (request, response, next) {
  if (!request.session.userId)
    return response.status(401).json({ error: 'Log in first' });

  if (Date.now() >= request.session.tokenExpiresAt - 60000)
    try {
      Object.assign(request.session, await refreshToken(request.session.refreshToken));
    } catch (error) {
      return request.session.destroy((sessionError) => {
        if (sessionError)
          throw sessionError;

        throw error;
      });
    }

  const user = await db.queryOneWithGroups(`
    SELECT users.*, '_', user_roles.*
    FROM users
    INNER JOIN user_roles ON users.id = user_roles.id
    WHERE users.id = ?
  `, request.session.userId, ['', 'roles']);
  delete user.api_fetched_at;
  response.locals.user = user;

  next();
});

app.get('auth/remember', function (_, response) {
  response.json(response.locals.user);
});

app.use('', router);

app.use(function (_, response) {
  response.status(404).json({ error: 'Not found' });
});

app.use(function (error, _, response, _) {
  // TODO: do something with error...
  response.status(500).json({ error: 'Server error' });
});

app.listen(config.port);
