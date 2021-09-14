#!/usr/bin/env node

import 'dotenv/config';
import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import mysqlSessionStoreFactory from 'express-mysql-session';
import session from 'express-session';
import db from './db';
import { asyncHandler } from './express-helpers';
import { hasLocalInteropKey, isAnything } from './guards';
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
  return new Promise(function (resolve, reject) {
    session.destroy(function (error) {
      if (error != null) {
        reject(error);
      }

      resolve();
    });
  });
}

db.initialize().then(() => {
  const app = express();

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

      await db.query('INSERT IGNORE INTO user_roles SET id = ?', [user.id]);
      //await log(logTypes.analytic, '{creator} logged in', userInfo.id);

      response.redirect(backUrl || '/');
    }),
  );

  app.use(
    asyncHandler(async function (request, response, next) {
      if (!request.session.userId) {
        return next();
      }

      response.typedLocals.osu = new Osu(request.session);

      try {
        const tokenInfo = await response.typedLocals.osu.tryRefreshToken();

        if (tokenInfo != null) {
          Object.assign(request.session, tokenInfo);
        }
      } catch (error) {
        // TODO: start a normal re-auth if the refresh token is too old
        await destroySession(request.session);
        throw error;
      }

      const user = await db.queryOneWithGroups<AuthUser & { api_fetched_at?: Date }>(
        `
          SELECT users.*, user_roles:roles
          FROM users
          INNER JOIN user_roles
            ON users.id = user_roles.id
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
    console.error(error);

    response.status(500).json({ error: 'Server error' });
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const httpServer = app.listen(parseInt(process.env.PORT!, 10));

  function shutdown(): void {
    Promise.allSettled([
      new Promise<void>((resolve) => {
        httpServer.close((error) => {
          if (error) {
            console.error(error);
          }

          console.log('HTTP server closed');
          resolve();
        });
      }),
      db
        .close()
        .then(() => console.log('Database connection(s) closed'))
        .catch((error) => console.error(error)),
    ]).finally(() => process.exit());
  }

  process.on('SIGINT', shutdown);
  process.on('SIGQUIT', shutdown);
  process.on('SIGTERM', shutdown);
});
