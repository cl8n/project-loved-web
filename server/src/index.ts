#!/usr/bin/env node

import AsyncLock from 'async-lock';
import type { ErrorRequestHandler, Request, Response } from 'express';
import express from 'express';
import mysqlSessionStoreFactory from 'express-mysql-session';
import session from 'express-session';
import { createHttpTerminator } from 'http-terminator';
import type { UserRole } from 'loved-bridge/tables';
import { LogType } from 'loved-bridge/tables';
import config from './config.js';
import db from './db.js';
import { asyncHandler } from './express-helpers.js';
import { hasLocalInteropKeyMiddleware, isAnyRoleMiddleware } from './guards.js';
import { dbLog, systemLog } from './log.js';
import { Osu, redirectToAuth } from './osu.js';
import router from './router.js';
import anyoneRouter from './routers/anyone.js';
import guestRouter from './routers/guest.js';
import interopRouter from './routers/interop.js';

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

  app.use('/local-interop', hasLocalInteropKeyMiddleware, interopRouter);

  app.use(
    session({
      cookie: {
        httpOnly: true,
        maxAge: 604800000, // 7 days
        secure: config.httpsAlways,
      },
      name: 'loved_sid',
      proxy: true,
      resave: false,
      saveUninitialized: false,
      secret: config.sessionSecret,
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

    redirectToAuth(request, response, ['identify', 'public']);
  });

  app.get(
    '/auth/callback',
    asyncHandler(async function (request, response) {
      const backUrl = request.session.authBackUrl;
      const state = request.session.authState;
      delete request.session.authBackUrl;
      delete request.session.authState;

      if (request.query.error) {
        if (request.query.error === 'access_denied') {
          return response.redirect(backUrl || '/');
        } else {
          throw request.query.error;
        }
      }

      if (!request.query.code) {
        return response.status(422).json({ error: 'No authorization code provided' });
      }

      if (!request.query.state || request.query.state !== state) {
        return response.status(422).json({ error: 'Invalid state. Try logging in again' });
      }

      const osu = new Osu();
      const scopes: OsuApiScopes = JSON.parse(
        Buffer.from(request.query.state, 'base64url').slice(8).toString(),
      );
      const tokenInfo = await osu.getToken(request.query.code, scopes);
      const user = await osu.createOrRefreshUser();

      if (user == null) {
        throw 'User not found using /me osu! API';
      }

      const logUser = { banned: user.banned, country: user.country, id: user.id, name: user.name };
      const scopesWithoutDefault = scopes.filter(
        (scope) => scope !== 'identify' && scope !== 'public',
      );

      if (scopesWithoutDefault.length > 0) {
        // TODO: Also support upgrading a token to more scopes
        await db.transact(async (connection) => {
          await connection.query('INSERT INTO extra_tokens SET ?', [
            {
              token: JSON.stringify(tokenInfo),
              user_id: user.id,
            },
          ]);
          await dbLog(
            LogType.extraTokenCreated,
            { scopes: scopesWithoutDefault, user: logUser },
            connection,
          );
        });
      } else {
        Object.assign(request.session, tokenInfo);
        request.session.userId = user.id;
        await dbLog(LogType.loggedIn, { user: logUser });
      }

      response.redirect(backUrl || '/');
    }),
  );

  app.use(
    asyncHandler(async function (request, response, next) {
      if (request.session?.userId == null) {
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

      const user = await db.queryOne<UserWithRoles>(
        `
          SELECT *
          FROM users
          WHERE id = ?
        `,
        [request.session.userId],
      );

      if (user == null) {
        throw 'Missing user';
      }

      user.roles = await db.query<UserRole>(
        `
          SELECT *
          FROM user_roles
          WHERE user_id = ?
        `,
        [user.id],
      );

      response.typedLocals.user = user;

      next();
    }),
  );

  app.use(guestRouter);

  // Below here requires authentication
  app.use((request, response, next) => {
    if (!request.session?.userId) {
      return response.status(401).json({ error: 'Log in first' });
    }

    next();
  });

  app.post(
    '/auth/bye',
    asyncHandler(async function (request, response) {
      const user = await response.typedLocals.osu.createOrRefreshUser(request.session.userId);

      if (user == null) {
        throw 'User not found during log out';
      }

      await dbLog(LogType.loggedOut, {
        user: { banned: user.banned, country: user.country, id: user.id, name: user.name },
      });

      await response.typedLocals.osu.revokeToken();
      await destroySession(request.session);

      response.status(204).send();
    }),
  );

  app.get('/auth/remember', function (_, response) {
    response.json(response.typedLocals.user);
  });

  app.use(anyoneRouter);

  // TODO split out this router. "isAnyRoleMiddleware" is here because the permissions aren't all figured out yet, and I want to prevent security issues beyond this point
  app.use(isAnyRoleMiddleware, router);

  app.use(function (_, response) {
    response.status(404).json({ error: 'Not found' });
  });

  // Express relies on there being 4 arguments in the signature of error handlers
  // Also for some reason this has to be typed manually
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(((error, _request, response, _next) => {
    systemLog(error, SyslogLevel.err);

    response.status(500).json({ error: 'Server error' });
  }) as ErrorRequestHandler);

  const httpServer = app.listen(config.port);
  const httpTerminator = createHttpTerminator({ server: httpServer });

  dbLog(LogType.apiServerStarted);
  systemLog('Starting', SyslogLevel.info);

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
