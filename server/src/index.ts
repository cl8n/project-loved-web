#!/usr/bin/env node

import 'dotenv/config';
import AsyncLock from 'async-lock';
import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import mysqlSessionStoreFactory from 'express-mysql-session';
import session from 'express-session';
import { createHttpTerminator } from 'http-terminator';
import db from './db';
import { asyncHandler } from './express-helpers';
import { hasLocalInteropKey, isAnything } from './guards';
import { systemLog } from './log';
import { authRedirectUrl, Osu } from './osu';
import router from './router';
import anyoneRouter from './routers/anyone';
import guestRouter from './routers/guest';
import interopRouter from './routers/interop';

if (
  process.env.HTTPS_ALWAYS == null ||
  process.env.PORT == null ||
  process.env.SESSION_SECRET == null
) {
  throw 'Invalid API server config';
}

// Impossible to type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MysqlSessionStore = mysqlSessionStoreFactory(session as any);

function destroySession(session: Request['session']): Promise<void> {
  return new Promise((resolve, reject) => {
    session.destroy((error) => {
      if (error != null) {
        reject(error);
      }

      resolve();
    });
  });
}

function reloadSession(session: Request['session']): Promise<void> {
  return new Promise((resolve, reject) => {
    session.reload((error) => {
      if (error != null) {
        reject(error);
      }

      resolve();
    });
  });
}

// The session is saved at the end of each request, so this only needs to be used
// if the session needs to be saved during a request.
function saveSession(session: Request['session']): Promise<void> {
  return new Promise((resolve, reject) => {
    session.save((error) => {
      if (error != null) {
        reject(error);
      }

      resolve();
    });
  });
}

db.initialize().then(() => {
  const app = express();
  const sessionLock = new AsyncLock();

  // Hack to add typing to locals
  app.use((_, response, next) => {
    // eslint-disable-next-line regex/invalid
    response.typedLocals = response.locals as Response['typedLocals'];
    next();
  });

  app.use(express.json());

  app.use('/local-interop', hasLocalInteropKey, interopRouter);

  app.use(
    session({
      cookie: {
        httpOnly: true,
        secure: process.env.HTTPS_ALWAYS === '1',
      },
      name: 'loved_sid',
      proxy: true,
      resave: false,
      saveUninitialized: false,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      secret: process.env.SESSION_SECRET!,
      store: new MysqlSessionStore(
        {
          checkExpirationInterval: 1800000, // 30 minutes
          expiration: 604800000, // 7 days
        },
        db.pool,
      ),
    }),
  );

  app.get('/auth/begin', function (request, response) {
    if (request.session.userId != null) {
      return response.status(403).json({ error: 'Already logged in!' });
    }

    request.session.authState = randomBytes(32).toString('hex');
    request.session.authBackUrl = request.get('Referrer');

    response.redirect(authRedirectUrl(request.session.authState));
  });

  app.get(
    '/auth/callback',
    asyncHandler(async function (request, response) {
      if (request.query.error) {
        throw request.query.error;
      }

      if (!request.query.code) {
        return response.status(422).json({ error: 'No authorization code provided' });
      }

      const backUrl = request.session.authBackUrl;
      const state = request.session.authState;
      delete request.session.authBackUrl;
      delete request.session.authState;

      if (!request.query.state || request.query.state !== state) {
        return response.status(422).json({ error: 'Invalid state. Try logging in again' });
      }

      const osu = new Osu();
      Object.assign(request.session, await osu.getToken(request.query.code));

      const user = await osu.createOrRefreshUser();

      if (user == null) {
        return response.status(500).json({ error: 'Could not get user info from osu! API' });
      }

      request.session.userId = user.id;

      await db.query('INSERT IGNORE INTO user_roles SET user_id = ?', [user.id]);
      //await log(logTypes.analytic, '{creator} logged in', userInfo.id);

      response.redirect(backUrl || '/');
    }),
  );

  app.use(
    asyncHandler(async function (request, response, next) {
      if (request.session.userId == null) {
        return next();
      }

      const responseSet = await sessionLock.acquire(request.session.userId.toString(), async () => {
        try {
          // TODO: Requiring reload of session for every authed request is inefficient,
          // but I'm not sure how to split this lock across multiple express middleware.
          // Ideally we would acquire a lock before loading the session at all, and then
          // release it after trying refreshing/saving the osu! auth token.
          await reloadSession(request.session);
        } catch {
          response.status(401).json({ error: 'osu! auth token expired. Try logging in again' });
          return true;
        }

        response.typedLocals.osu = new Osu(request.session);

        try {
          const tokenInfo = await response.typedLocals.osu.tryRefreshToken();

          if (tokenInfo != null) {
            Object.assign(request.session, tokenInfo);
            await saveSession(request.session);
          }
        } catch (error) {
          await destroySession(request.session);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (typeof error === 'object' && error != null && (error as any).status === 401) {
            // TODO: start a normal re-auth if the refresh token is too old
            response.status(401).json({ error: 'osu! auth token expired. Try logging in again' });
            return true;
          } else {
            throw error;
          }
        }

        return false;
      });

      if (responseSet) {
        return;
      }

      const user = await db.queryOneWithGroups<AuthUser & { api_fetched_at?: Date }>(
        `
          SELECT users.*, user_roles:roles
          FROM users
          INNER JOIN user_roles
            ON users.id = user_roles.user_id
          WHERE users.id = ?
        `,
        [request.session.userId],
      );

      if (user == null) {
        throw 'Missing user';
      }

      delete user.api_fetched_at;
      response.typedLocals.user = user;

      next();
    }),
  );

  app.use(guestRouter);

  // Below here requires authentication
  app.use((request, response, next) => {
    if (!request.session.userId) {
      return response.status(401).json({ error: 'Log in first' });
    }

    next();
  });

  app.post(
    '/auth/bye',
    asyncHandler(async function (request, response) {
      await response.typedLocals.osu.revokeToken();
      //log(logTypes.analytic, '{creator} logged out', request.session.userId);
      await destroySession(request.session);

      response.status(204).send();
    }),
  );

  app.get('/auth/remember', function (_, response) {
    response.json(response.typedLocals.user);
  });

  app.use(anyoneRouter);

  // TODO split out this router. "isAnything" is here because the permissions aren't all figured out yet, and I want to prevent security issues beyond this point
  app.use(isAnything, router);

  app.use(function (_, response) {
    response.status(404).json({ error: 'Not found' });
  });

  // Express relies on there being 4 arguments in the signature of error handlers
  // Also for some reason this has to be typed manually
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(function (error: unknown, _request: Request, response: Response, _next: NextFunction) {
    // TODO: can probably do better than these logs
    //log(logTypes.error, `{plain}${error}`);
    systemLog(error, SyslogLevel.err);

    response.status(500).json({ error: 'Server error' });
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const httpServer = app.listen(parseInt(process.env.PORT!, 10));
  const httpTerminator = createHttpTerminator({ server: httpServer });

  function shutdown(): void {
    systemLog('Received exit signal', SyslogLevel.info);

    Promise.allSettled([
      httpTerminator
        .terminate()
        .then(() => systemLog('Closed all HTTP(S) connections', SyslogLevel.info))
        .catch((error) => systemLog(error, SyslogLevel.err)),
      db
        .close()
        .then(() => systemLog('Closed all DB connections', SyslogLevel.info))
        .catch((error) => systemLog(error, SyslogLevel.err)),
    ]).finally(() => {
      systemLog('Exiting', SyslogLevel.info);
      process.exit();
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGQUIT', shutdown);
  process.on('SIGTERM', shutdown);
});
