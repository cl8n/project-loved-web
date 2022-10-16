import { Router } from 'express';
import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import type { Beatmapset, Consent, ConsentBeatmapset, Review, User } from 'loved-bridge/tables';
import { LogType, Role } from 'loved-bridge/tables';
import type { MysqlConnectionType } from '../db.js';
import db from '../db.js';
import { asyncHandler } from '../express-helpers.js';
import { currentUserRoles } from '../guards.js';
import { pick } from '../helpers.js';
import { dbLog } from '../log.js';
import {
  isGameMode,
  isGameModeArray,
  isInteger,
  isMapperConsent,
  isMapperConsentBeatmapsetArray,
} from '../type-guards.js';

const anyoneRouter = Router();
export default anyoneRouter;

anyoneRouter.post(
  '/mapper-consent',
  asyncHandler(async (req, res) => {
    if (!isMapperConsent(req.body.consent)) {
      return res.status(422).json({ error: 'Invalid consent' });
    }

    if (!isMapperConsentBeatmapsetArray(req.body.consentBeatmapsets)) {
      return res.status(422).json({ error: 'Invalid mapper consent beatmapsets' });
    }

    const user = await res.typedLocals.osu.createOrRefreshUser(req.body.consent.user_id);

    if (user == null) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasRole = currentUserRoles(req, res);

    if (user.id !== req.session.userId && !hasRole(Role.captain)) {
      return res.status(403).json({
        error: 'Must be a captain to update consents of other users',
      });
    }

    const currentConsent = await db.queryOne<Consent>(
      'SELECT * FROM mapper_consents WHERE user_id = ?',
      [user.id],
    );
    const currentConsentBeatmapsets = await db.query<ConsentBeatmapset>(
      'SELECT * FROM mapper_consent_beatmapsets WHERE user_id = ?',
      [user.id],
    );

    const currentConsentBeatmapsetIds = currentConsentBeatmapsets.map((c) => c.beatmapset_id);
    const newConsentBeatmapsetIds = req.body.consentBeatmapsets.map((c) => c.beatmapset_id);
    const beatmapsetIdsAdded = newConsentBeatmapsetIds.filter(
      (id) => !currentConsentBeatmapsetIds.includes(id),
    );
    const beatmapsetIdsRemoved = currentConsentBeatmapsetIds.filter(
      (id) => !newConsentBeatmapsetIds.includes(id),
    );

    for (const beatmapsetId of beatmapsetIdsAdded) {
      const beatmapset = await res.typedLocals.osu.createOrRefreshBeatmapset(beatmapsetId);

      if (beatmapset == null) {
        return res.status(404).json({ error: `Beatmapset #${beatmapsetId} not found` });
      }
    }

    const logActor = pick(res.typedLocals.user, ['banned', 'country', 'id', 'name']);
    const logUser = pick(user, ['banned', 'country', 'id', 'name']);

    // For easier typing in transaction
    const newConsent = req.body.consent;
    const newConsentBeatmapsets = req.body.consentBeatmapsets;

    await db.transact(async (connection) => {
      const dbFields = {
        consent: newConsent.consent,
        consent_reason: newConsent.consent_reason,
        updated_at: new Date(),
        updater_id: req.session.userId,
      };
      const dbFieldsWithPK = {
        ...dbFields,
        user_id: newConsent.user_id,
      };

      if (currentConsent == null) {
        await connection.query('INSERT INTO mapper_consents SET ?', [dbFieldsWithPK]);
        await dbLog(
          LogType.mapperConsentCreated,
          {
            actor: logActor,
            consent: newConsent.consent,
            reason: newConsent.consent_reason,
            user: logUser,
          },
          connection,
        );
      } else if (
        currentConsent.consent !== newConsent.consent ||
        currentConsent.consent_reason !== newConsent.consent_reason
      ) {
        await connection.query('UPDATE mapper_consents SET ? WHERE user_id = ?', [
          dbFields,
          dbFieldsWithPK.user_id,
        ]);
        await dbLog(
          LogType.mapperConsentUpdated,
          {
            actor: logActor,
            from: {
              consent: currentConsent.consent,
              reason: currentConsent.consent_reason,
            },
            to: {
              consent: newConsent.consent,
              reason: newConsent.consent_reason,
            },
            user: logUser,
          },
          connection,
        );
      }

      if (beatmapsetIdsRemoved.length > 0) {
        await connection.query(
          `
            DELETE FROM mapper_consent_beatmapsets
            WHERE beatmapset_id IN (?)
              AND user_id = ?
          `,
          [beatmapsetIdsRemoved, newConsent.user_id],
        );
      }
      for (const beatmapsetId of beatmapsetIdsRemoved) {
        const beatmapset = await connection.queryOne<Beatmapset>(
          'SELECT * FROM beatmapsets WHERE id = ?',
          [beatmapsetId],
        );

        if (beatmapset == null) {
          throw 'Missing beatmapset for logging consent beatmapset delete';
        }

        await dbLog(
          LogType.mapperConsentBeatmapsetDeleted,
          {
            actor: logActor,
            beatmapset: {
              artist: beatmapset.artist,
              id: beatmapset.id,
              title: beatmapset.title,
            },
            user: logUser,
          },
          connection,
        );
      }

      for (const consentBeatmapset of newConsentBeatmapsets) {
        const beatmapset = await connection.queryOne<Beatmapset>(
          'SELECT * FROM beatmapsets WHERE id = ?',
          [consentBeatmapset.beatmapset_id],
        );

        if (beatmapset == null) {
          throw 'Missing beatmapset for logging consent beatmapset create or update';
        }

        const currentConsentBeatmapset = currentConsentBeatmapsets.find(
          (c) => c.beatmapset_id === consentBeatmapset.beatmapset_id,
        );
        const dbFields = pick(consentBeatmapset, ['consent', 'consent_reason']);
        const dbFieldsWithPK = {
          ...dbFields,
          beatmapset_id: consentBeatmapset.beatmapset_id,
          user_id: newConsent.user_id,
        };
        const logBeatmapset = pick(beatmapset, ['artist', 'id', 'title']);

        if (currentConsentBeatmapset == null) {
          await connection.query('INSERT INTO mapper_consent_beatmapsets SET ?', [dbFieldsWithPK]);
          await dbLog(
            LogType.mapperConsentBeatmapsetCreated,
            {
              actor: logActor,
              beatmapset: logBeatmapset,
              consent: consentBeatmapset.consent,
              reason: consentBeatmapset.consent_reason,
              user: logUser,
            },
            connection,
          );
        } else if (
          currentConsentBeatmapset.consent !== consentBeatmapset.consent ||
          currentConsentBeatmapset.consent_reason !== consentBeatmapset.consent_reason
        ) {
          await connection.query(
            `
              UPDATE mapper_consent_beatmapsets
              SET ?
              WHERE beatmapset_id = ?
              AND user_id = ?
            `,
            [dbFields, dbFieldsWithPK.beatmapset_id, dbFieldsWithPK.user_id],
          );
          await dbLog(
            LogType.mapperConsentBeatmapsetUpdated,
            {
              actor: logActor,
              beatmapset: logBeatmapset,
              from: {
                consent: currentConsentBeatmapset.consent,
                reason: currentConsentBeatmapset.consent_reason,
              },
              to: {
                consent: consentBeatmapset.consent,
                reason: consentBeatmapset.consent_reason,
              },
              user: logUser,
            },
            connection,
          );
        }
      }
    });

    const consent: Consent & {
      beatmapset_consents?: (ConsentBeatmapset & { beatmapset: Beatmapset })[];
      mapper: User;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    } = (await db.queryOneWithGroups<Consent & { mapper: User }>(
      `
        SELECT mapper_consents.*, mappers:mapper
        FROM mapper_consents
        INNER JOIN users AS mappers
          ON mapper_consents.user_id = mappers.id
        WHERE mapper_consents.user_id = ?
      `,
      [newConsent.user_id],
    ))!;
    consent.beatmapset_consents = await db.queryWithGroups<
      ConsentBeatmapset & { beatmapset: Beatmapset }
    >(
      `
        SELECT mapper_consent_beatmapsets.*, beatmapsets:beatmapset
        FROM mapper_consent_beatmapsets
        INNER JOIN beatmapsets
          ON mapper_consent_beatmapsets.beatmapset_id = beatmapsets.id
        WHERE mapper_consent_beatmapsets.user_id = ?
      `,
      [newConsent.user_id],
    );

    res.json(consent);
  }),
);

anyoneRouter.post(
  '/review',
  asyncHandler(async (req, res) => {
    if (!isInteger(req.body.beatmapsetId)) {
      return res.status(422).json({ error: 'Invalid beatmapset ID' });
    }

    if (!isGameMode(req.body.gameMode)) {
      return res.status(422).json({ error: 'Invalid game mode' });
    }

    if (typeof req.body.reason !== 'string') {
      return res.status(422).json({ error: 'Invalid reason' });
    }

    if (
      !isInteger(req.body.score) ||
      req.body.score === 0 ||
      req.body.score < -4 ||
      req.body.score > 3
    ) {
      return res.status(422).json({ error: 'Invalid score' });
    }

    const hasRole = currentUserRoles(req, res);

    if (req.body.score === -4 && !hasRole(Role.captain, req.body.gameMode)) {
      return res.status(403).send({ error: 'Must be a captain to mark as not allowed' });
    }

    const captainRole = res.typedLocals.user.roles.find(
      (role) => role.game_mode === req.body.gameMode && role.role_id === Role.captain,
    );
    const activeCaptain = captainRole == null ? null : !captainRole.alumni;
    const existingReview = await db.queryOne<Review>(
      `
        SELECT *
        FROM reviews
        WHERE beatmapset_id = ?
          AND reviewer_id = ?
          AND game_mode = ?
      `,
      [req.body.beatmapsetId, res.typedLocals.user.id, req.body.gameMode],
    );

    // "Support" and "Rejection" are no longer selectable, unless the review was already set to the same score
    if (
      (req.body.score === -2 || req.body.score === 2) &&
      req.body.score !== existingReview?.score
    ) {
      return res.status(422).json({ error: 'Invalid score' });
    }

    const deleteExistingSubmission = (connection: MysqlConnectionType) =>
      connection.query(
        `
          DELETE FROM submissions
          WHERE beatmapset_id = ?
            AND game_mode = ?
            AND submitter_id = ?
            AND reason IS NULL
        `,
        [req.body.beatmapsetId, req.body.gameMode, res.typedLocals.user.id],
      );

    if (existingReview != null) {
      return await db.transact(async (connection) => {
        await connection.query('UPDATE reviews SET ? WHERE id = ?', [
          {
            reason: req.body.reason,
            reviewed_at: new Date(),
            score: req.body.score,
          },
          existingReview.id,
        ]);
        await deleteExistingSubmission(connection);

        res.json({
          ...(await connection.queryOne<Review>('SELECT * FROM reviews WHERE id = ?', [
            existingReview.id,
          ])),
          active_captain: activeCaptain,
        });
      });
    }

    const beatmapset = await res.typedLocals.osu.createOrRefreshBeatmapset(
      req.body.beatmapsetId,
      true,
    );

    if (beatmapset == null) {
      return res.status(422).json({ error: 'Invalid beatmapset ID' });
    }

    if (!beatmapset.game_modes.has(req.body.gameMode)) {
      return res.status(422).json({
        error: `Beatmapset has no beatmaps in game mode ${req.body.gameMode}`,
      });
    }

    await db.transact(async (connection) => {
      const { insertId } = await connection.query('INSERT INTO reviews SET ?', [
        {
          beatmapset_id: req.body.beatmapsetId,
          game_mode: req.body.gameMode,
          reason: req.body.reason,
          reviewed_at: new Date(),
          reviewer_id: res.typedLocals.user.id,
          score: req.body.score,
        },
      ]);
      await deleteExistingSubmission(connection);

      res.json({
        ...(await connection.queryOne<Review>('SELECT * FROM reviews WHERE id = ?', [insertId])),
        active_captain: activeCaptain,
      });
    });
  }),
);

anyoneRouter.delete(
  '/review',
  asyncHandler(async (req, res) => {
    const reviewId = parseInt(req.query.reviewId ?? '', 10);

    if (isNaN(reviewId)) {
      return res.status(422).json({ error: 'Invalid review ID' });
    }

    const review = await db.queryOne<Pick<Review, 'reviewer_id'>>(
      `
        SELECT reviewer_id
        FROM reviews
        WHERE id = ?
      `,
      [reviewId],
    );

    if (review == null) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.reviewer_id !== res.typedLocals.user.id) {
      return res.status(403).json({ error: "This isn't your review" });
    }

    await db.query('DELETE FROM reviews WHERE id = ?', [reviewId]);

    res.status(204).send();
  }),
);

anyoneRouter.post(
  '/review-many',
  asyncHandler(async (req, res) => {
    if (!isInteger(req.body.beatmapsetId)) {
      return res.status(422).json({ error: 'Invalid beatmapset ID' });
    }

    if (!isGameModeArray(req.body.gameModes)) {
      return res.status(422).json({ error: 'Invalid game modes' });
    }

    if (req.body.gameModes.length === 0) {
      return res.status(422).json({ error: 'No game modes selected' });
    }

    if (typeof req.body.reason !== 'string') {
      return res.status(422).json({ error: 'Invalid reason' });
    }

    if (req.body.score !== 1 && req.body.score !== 3) {
      return res.status(422).json({ error: 'Invalid score' });
    }

    const beatmapset = await res.typedLocals.osu.createOrRefreshBeatmapset(req.body.beatmapsetId);

    if (beatmapset == null) {
      return res.status(422).json({ error: 'Invalid beatmapset ID' });
    }

    // TODO: This should allow cases where the set is Loved but at least one
    //       difficulty in each requested mode is Pending/WIP/Graveyard
    if (beatmapset.ranked_status > RankedStatus.pending) {
      return res.status(422).json({ error: 'Beatmapset is already Ranked/Loved/Qualified' });
    }

    const missingGameModes = new Set(req.body.gameModes);

    for (const gameMode of beatmapset.game_modes) {
      missingGameModes.delete(gameMode);
    }

    if (missingGameModes.size > 0) {
      return res.status(422).json({
        error: `Beatmapset has no beatmaps in game mode ${[...missingGameModes].join(', ')}`,
      });
    }

    const deleteExistingSubmission = (connection: MysqlConnectionType, gameMode: GameMode) =>
      connection.query(
        `
          DELETE FROM submissions
          WHERE beatmapset_id = ?
            AND game_mode = ?
            AND submitter_id = ?
            AND reason IS NULL
        `,
        [beatmapset.id, gameMode, res.typedLocals.user.id],
      );
    const now = new Date();

    await db.transact(async (connection) => {
      for (const gameMode of req.body.gameModes as GameMode[]) {
        const existingReview = await connection.queryOne<Pick<Review, 'id'>>(
          `
            SELECT id
            FROM reviews
            WHERE beatmapset_id = ?
              AND game_mode = ?
              AND reviewer_id = ?
          `,
          [beatmapset.id, gameMode, res.typedLocals.user.id],
        );

        if (existingReview != null) {
          await connection.query('UPDATE reviews SET ? WHERE id = ?', [
            {
              reason: req.body.reason,
              reviewed_at: now,
              score: req.body.score,
            },
            existingReview.id,
          ]);
        } else {
          await connection.query('INSERT INTO reviews SET ?', [
            {
              beatmapset_id: beatmapset.id,
              game_mode: gameMode,
              reason: req.body.reason,
              reviewed_at: now,
              reviewer_id: res.typedLocals.user.id,
              score: req.body.score,
            },
          ]);
        }

        await deleteExistingSubmission(connection, gameMode);
      }
    });

    res.status(204).send();
  }),
);
