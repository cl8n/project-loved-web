import archiver from 'archiver';
import { Router } from 'express';
import {
  GameMode,
  gameModeLongName,
  gameModes,
  gameModeShortName,
} from 'loved-bridge/beatmaps/gameMode';
import { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import type {
  AssigneeType,
  Beatmap,
  Beatmapset,
  Consent,
  ConsentBeatmapset,
  ExtraToken,
  InteropKey,
  Log,
  Nomination,
  NominationDescriptionEdit,
  Poll,
  Review,
  Round,
  RoundGameMode,
  Submission,
  User,
  UserRole,
} from 'loved-bridge/tables';
import {
  ConsentValue,
  CreatorsState,
  DescriptionState,
  LogType,
  MetadataState,
  PacksState,
  Role,
} from 'loved-bridge/tables';
import { randomBytes } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, normalize } from 'node:path';
import superagent from 'superagent';
import { deleteCache } from './cache.js';
import config from './config.js';
import db from './db.js';
import { asyncHandler } from './express-helpers.js';
import {
  currentUserRoles,
  isAnyRoleMiddleware,
  isCaptainMiddleware,
  isModeratorMiddleware,
  isNewsAuthorMiddleware,
  isPackUploaderMiddleware,
} from './guards.js';
import { cleanNominationDescription, groupBy, joinList, pick, sortCreators } from './helpers.js';
import {
  dbLog,
  dbLogBeatmapset,
  dbLogReview,
  dbLogSubmission,
  dbLogUser,
  systemLog,
} from './log.js';
import { Osu, redirectToAuth } from './osu.js';
import { accessSetting, settings, updateSettings } from './settings.js';
import {
  isAssigneeType,
  isGameMode,
  isIdString,
  isInteger,
  isIntegerArray,
  isLogTypeArray,
  isRecord,
  isRecordArray,
  isResponseError,
  isStringArray,
  isUserRoleWithoutUserIdArray,
} from './type-guards.js';

const router = Router();
export default router;

// TODO: rethink guards

router.get(
  '/captains',
  isCaptainMiddleware,
  asyncHandler(async (_, res) => {
    res.json(
      groupBy<GameMode, User>(
        await db.queryWithGroups<Pick<UserRole, 'game_mode'> & { user: User }>(
          `
            SELECT user_roles.game_mode, users:user
            FROM users
            INNER JOIN user_roles
              ON users.id = user_roles.user_id
            WHERE user_roles.game_mode >= 0
              AND user_roles.role_id = ?
              AND user_roles.alumni = 0
            ORDER BY users.name ASC
          `,
          [Role.captain],
        ),
        'game_mode',
        'user',
      ),
    );
  }),
);

router.get(
  '/search-beatmapset',
  asyncHandler(async (req, res) => {
    const query = req.query.query;

    if (!query) {
      return res.status(422).json({ error: 'Empty search query' });
    }

    const hits = await db.query<Pick<Beatmapset, 'artist' | 'creator_name' | 'id' | 'title'>>(
      `
        SELECT artist, creator_name, id, title
        FROM beatmapsets
        WHERE MATCH (artist, creator_name, title) AGAINST (?)
      `,
      [query],
    );

    if (isIdString(query)) {
      const beatmapset = await db.queryOne<
        Pick<Beatmapset, 'artist' | 'creator_name' | 'id' | 'title'>
      >(
        `
          SELECT artist, creator_name, id, title
          FROM beatmapsets
          WHERE id = ?
        `,
        [query],
      );

      if (beatmapset != null) {
        hits.unshift(beatmapset);
      }
    }

    res.json(hits);
  }),
);

router.post(
  '/nomination-submit',
  asyncHandler(async (req, res) => {
    //#region Validation
    if (!isInteger(req.body.beatmapsetId)) {
      return res.status(422).json({ error: 'Invalid beatmapset ID' });
    }

    if (!isGameMode(req.body.gameMode)) {
      return res.status(422).json({ error: 'Invalid game mode' });
    }

    if (!isInteger(req.body.roundId)) {
      return res.status(422).json({ error: 'Invalid round ID' });
    }

    const existingNominationInPlanner = await db.queryOne(
      `
        SELECT 1
        FROM nominations
        WHERE beatmapset_id = ?
          AND game_mode = ?
          AND round_id IS NULL
      `,
      [req.body.beatmapsetId, req.body.gameMode],
    );

    // Make sure the nomination is not already in the planner
    if (existingNominationInPlanner != null) {
      return res.status(422).json({
        error: 'This map is already in the nomination planner, move it from there instead',
      });
    }

    // If there is a parent nomination ID, make sure it refers to an existing nomination with the
    // same round, same beatmapset, and different game mode
    if (req.body.parentId != null) {
      if (!isInteger(req.body.parentId)) {
        return res.status(422).json({ error: 'Invalid parent nomination ID' });
      }

      const parentNomination = await db.queryOne<
        Pick<Nomination, 'beatmapset_id' | 'game_mode' | 'round_id'>
      >(
        `
          SELECT beatmapset_id, game_mode, round_id
          FROM nominations
          WHERE id = ?
        `,
        [req.body.parentId],
      );

      if (parentNomination == null) {
        return res.status(404).json({ error: 'Parent nomination not found' });
      }

      if (parentNomination.beatmapset_id !== req.body.beatmapsetId) {
        return res.status(422).json({ error: 'Parent nomination must be for the same beatmapset' });
      }

      if (parentNomination.game_mode === req.body.gameMode) {
        return res
          .status(422)
          .json({ error: 'Parent nomination must be in a different game mode' });
      }

      if (parentNomination.round_id !== req.body.roundId) {
        return res.status(422).json({ error: 'Parent nomination must be for the same round' });
      }
    }

    const beatmapset = await res.typedLocals.osu.createOrRefreshBeatmapset(req.body.beatmapsetId);

    // Make sure the beatmapset exists
    if (beatmapset == null) {
      return res.status(404).json({ error: 'Beatmapset not found' });
    }

    // Make sure the beatmapset is not approved
    // TODO: This should allow cases where the set is Loved but at least one difficulty in the
    //       requested game mode is Pending/WIP/Graveyard
    if (beatmapset.ranked_status > RankedStatus.pending) {
      return res.status(422).json({ error: 'Beatmapset is already Ranked/Loved/Qualified' });
    }

    // Make sure the beatmapset has beatmaps in the requested game mode
    if (!beatmapset.game_modes.has(req.body.gameMode)) {
      return res.status(422).json({
        error: `Beatmapset has no beatmaps in game mode ${gameModeLongName(req.body.gameMode)}`,
      });
    }

    // If the nomination is for osu!standard, make sure it has enough favorites
    if (req.body.gameMode === GameMode.osu && beatmapset.favorite_count < 30) {
      return res.status(422).json({ error: 'osu! nominations must have at least 30 favorites' });
    }

    const existingNomination = await db.queryOne(
      `
        SELECT 1
        FROM nominations
        WHERE round_id = ?
          AND game_mode = ?
          AND beatmapset_id = ?
      `,
      [req.body.roundId, req.body.gameMode, beatmapset.id],
    );

    // Make sure the nomination is not a duplicate
    if (existingNomination != null) {
      return res.status(422).json({
        error: "Duplicate nomination. Refresh the page if you don't see it",
      });
    }

    const captainReview = await db.queryOne(
      `
        SELECT 1
        FROM reviews
        WHERE beatmapset_id = ?
          AND game_mode = ?
          AND reviewer_id IN (
            SELECT user_id
            FROM user_roles
            WHERE alumni = 0
              AND game_mode = ?
              AND role_id = ?
          )
      `,
      [beatmapset.id, req.body.gameMode, req.body.gameMode, Role.captain],
    );

    // Make sure an active captain has reviewed the beatmapset
    if (captainReview == null) {
      return res.status(422).json({ error: 'No captains have reviewed this map' });
    }

    const notAllowedReview = await db.queryOne(
      `
        SELECT 1
        FROM reviews
        WHERE beatmapset_id = ?
          AND game_mode = ?
          AND score < -3
      `,
      [beatmapset.id, req.body.gameMode],
    );

    // Make sure the beatmapset has no "Not allowed" reviews
    if (notAllowedReview != null) {
      return res.status(422).json({ error: 'There is a "Not allowed" review on this map' });
    }

    const mapper = await db.queryOne<Pick<User, 'banned'>>(
      `
        SELECT banned
        FROM users
        WHERE id = ?
      `,
      [beatmapset.creator_id],
    );

    // Make sure the mapper is not banned
    if (mapper == null || mapper.banned) {
      return res.status(422).json({ error: 'The mapper is banned' });
    }

    const consent = await db.queryOne<Pick<Consent, 'consent'>>(
      `
        SELECT consent
        FROM mapper_consents
        WHERE user_id = ?
      `,
      [beatmapset.creator_id],
    );
    const consentBeatmapset = await db.queryOne<Pick<ConsentBeatmapset, 'consent'>>(
      `
        SELECT consent
        FROM mapper_consent_beatmapsets
        WHERE beatmapset_id = ?
          AND user_id = ?
      `,
      [beatmapset.id, beatmapset.creator_id],
    );
    const consentValue = consentBeatmapset?.consent ?? consent?.consent;

    // Make sure the mapper didn't reject the beatmapset
    if (consentValue === ConsentValue.no || consentValue === false) {
      return res.status(422).json({ error: 'The mapper does not want this map Loved' });
    }

    const allowedLengthBeatmap = await db.queryOne(
      `
        SELECT 1
        FROM beatmaps
        WHERE beatmapset_id = ?
          AND deleted_at IS NULL
          AND game_mode = ?
          AND total_length >= 20
      `,
      [beatmapset.id, req.body.gameMode],
    );

    // Make sure at least one beatmap is 20 seconds or longer
    if (allowedLengthBeatmap == null) {
      return res.status(422).json({ error: 'Every beatmap in the beatmapset is too short' });
    }
    //#endregion

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const nominationCount = (await db.queryOne<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM nominations
        WHERE round_id = ?
          AND game_mode = ?
      `,
      [req.body.roundId, req.body.gameMode],
    ))!.count;
    // TODO can't actually be undefined but TS doesn't see that it's assigned in transaction below
    let nominationId: Nomination['id'] | undefined;

    await db.transact(async (connection) => {
      nominationId = (
        await connection.query('INSERT INTO nominations SET ?', [
          {
            beatmapset_id: beatmapset.id,
            game_mode: req.body.gameMode,
            order: nominationCount,
            parent_id: req.body.parentId,
            round_id: req.body.roundId,
          },
        ])
      ).insertId;

      await connection.query('INSERT INTO nomination_nominators SET ?', [
        {
          nomination_id: nominationId,
          nominator_id: res.typedLocals.user.id,
        },
      ]);
      await connection.query(
        `
          INSERT INTO beatmapset_creators (creator_id, nomination_id)
            SELECT creator_id, ?
            FROM beatmapsets
            WHERE id = ?
            UNION DISTINCT
            SELECT DISTINCT creator_id, ?
            FROM beatmaps
            WHERE beatmapset_id = ?
              AND game_mode = ?
              AND deleted_at IS NULL
        `,
        [nominationId, beatmapset.id, nominationId, beatmapset.id, req.body.gameMode],
      );
    });

    const nomination: Nomination & {
      beatmaps?: (Beatmap & { excluded: false })[];
      beatmapset?: Beatmapset;
      beatmapset_creators?: User[];
      description_author: null;
      description_edits?: [];
      metadata_assignees?: [];
      moderator_assignees?: [];
      news_editor_assignees?: [];
      nominators?: User[];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    } = (await db.queryOne<Nomination & { description_author: null }>(
      `
        SELECT *, NULL AS description_author
        FROM nominations
        WHERE id = ?
      `,
      [nominationId],
    ))!;
    const beatmaps = await db.query<Beatmap & { excluded: false }>(
      `
        SELECT *, FALSE AS excluded
        FROM beatmaps
        WHERE beatmapset_id = ?
          AND game_mode = ?
          AND deleted_at IS NULL
        ORDER BY key_count ASC, star_rating ASC
      `,
      [nomination.beatmapset_id, req.body.gameMode],
    );
    const creators = await db.query<User>(
      `
        SELECT users.*
        FROM beatmapset_creators
        INNER JOIN users
          ON beatmapset_creators.creator_id = users.id
        WHERE beatmapset_creators.nomination_id = ?
      `,
      [nominationId],
    );
    const nominators = await db.query<User>(
      `
        SELECT users.*
        FROM nomination_nominators
        INNER JOIN users
          ON nomination_nominators.nominator_id = users.id
        WHERE nomination_nominators.nomination_id = ?
      `,
      [nominationId],
    );

    nomination.beatmaps = beatmaps;
    nomination.beatmapset = beatmapset;
    nomination.beatmapset_creators = sortCreators(creators, beatmapset.creator_id);
    nomination.description_edits = [];
    nomination.nominators = nominators;
    nomination.metadata_assignees = [];
    nomination.moderator_assignees = [];
    nomination.news_editor_assignees = [];

    // TODO: log me!

    res.json(nomination);
  }),
);

router.post(
  '/nomination-edit-description',
  asyncHandler(async (req, res) => {
    // TODO if round is done, deny
    // TODO if polls are open and user is not news author, deny
    // TODO if polls are open and user is news author, allow

    if (req.body.description !== null && typeof req.body.description !== 'string') {
      return res.status(422).json({ error: 'Invalid description' });
    }

    if (!isInteger(req.body.nominationId)) {
      return res.status(422).json({ error: 'Invalid nomination ID' });
    }

    const existingNomination = await db.queryOne<
      Pick<Nomination, 'description' | 'description_author_id' | 'game_mode'>
    >(
      `
        SELECT description, description_author_id, game_mode
        FROM nominations
        WHERE id = ?
      `,
      [req.body.nominationId],
    );

    if (existingNomination == null) {
      return res.status(422).json({ error: 'Invalid nomination ID' });
    }

    const {
      description: prevDescription,
      description_author_id: prevAuthorId,
      game_mode: gameMode,
    } = existingNomination;
    const hasRole = currentUserRoles(req, res);

    if (
      !hasRole(Role.captain, gameMode) &&
      !(prevDescription != null && hasRole(Role.newsEditor))
    ) {
      return res.status(403).send();
    }

    if (!hasRole(Role.captain, gameMode) && req.body.description == null) {
      return res.status(403).json({ error: "Can't remove description as editor" });
    }

    const description = await cleanNominationDescription(req.body.description, res.typedLocals.osu);

    await db.transact(async (connection) => {
      await connection.query(
        `
          UPDATE nominations
          SET description = ?, description_author_id = ?, description_state = ?
          WHERE id = ?
        `,
        [
          description,
          description == null
            ? null
            : prevDescription == null
              ? res.typedLocals.user.id
              : prevAuthorId,
          hasRole(Role.newsEditor) &&
          description != null &&
          prevAuthorId !== res.typedLocals.user.id &&
          prevDescription != null
            ? DescriptionState.reviewed
            : DescriptionState.notReviewed,
          req.body.nominationId,
        ],
      );

      if (description !== prevDescription) {
        await connection.query(`INSERT INTO nomination_description_edits SET ?`, [
          {
            description,
            edited_at: new Date(),
            editor_id: res.typedLocals.user.id,
            nomination_id: req.body.nominationId,
          },
        ]);
      }
    });

    const nomination = await db.queryOneWithGroups<
      Nomination & {
        description_author: User | null;
        description_edits?: (NominationDescriptionEdit & { editor: User })[];
      }
    >(
      `
        SELECT nominations.*, description_authors:description_author
        FROM nominations
        LEFT JOIN users AS description_authors
          ON nominations.description_author_id = description_authors.id
        WHERE nominations.id = ?
      `,
      [req.body.nominationId],
    );

    if (nomination == null) {
      throw 'Missing nomination on description update';
    }

    nomination.description_edits = await db.queryWithGroups<
      NominationDescriptionEdit & { editor: User }
    >(
      `
        SELECT nomination_description_edits.*, editors:editor
        FROM nomination_description_edits
        INNER JOIN users AS editors
          ON nomination_description_edits.editor_id = editors.id
        WHERE nomination_description_edits.nomination_id = ?
        ORDER BY nomination_description_edits.edited_at ASC
      `,
      [req.body.nominationId],
    );

    res.json(nomination);
  }),
);

router.post(
  '/nomination-edit-metadata',
  asyncHandler(async (req, res) => {
    const hasRole = currentUserRoles(req, res);

    if (!hasRole([Role.metadata, Role.newsAuthor])) {
      return res.status(403).json({ error: 'Must be a metadata checker or news author' });
    }

    const nomination:
      | (Pick<Nomination, 'beatmapset_id' | 'game_mode' | 'metadata_state'> &
          Partial<Nomination> & {
            beatmapset?: Beatmapset;
            beatmapset_creators?: User[];
          })
      | null = await db.queryOne<
      Pick<Nomination, 'beatmapset_id' | 'game_mode' | 'metadata_state'>
    >(
      `
        SELECT beatmapset_id, game_mode, metadata_state
        FROM nominations
        WHERE id = ?
      `,
      [req.body.nominationId],
    );

    if (nomination == null) {
      return res.status(422).json({ error: 'Invalid nomination ID' });
    }

    await db.transact(async (connection) => {
      if (hasRole(Role.metadata)) {
        let artist = req.body.artist;
        let title = req.body.title;

        if (req.body.state === MetadataState.good) {
          artist = null;
          title = null;

          if (nomination.metadata_state === MetadataState.needsChange) {
            await res.typedLocals.osu.createOrRefreshBeatmapset(nomination.beatmapset_id, true);
          }
        }

        await connection.query(
          `
            UPDATE nominations
            SET metadata_state = ?, overwrite_artist = ?, overwrite_title = ?
            WHERE id = ?
          `,
          [req.body.state, artist, title, req.body.nominationId],
        );
      }

      Object.assign(
        nomination,
        await connection.queryOneWithGroups<Nomination & { beatmapset: Beatmapset }>(
          `
            SELECT nominations.*, beatmapsets:beatmapset
            FROM nominations
            INNER JOIN beatmapsets
              ON nominations.beatmapset_id = beatmapsets.id
            WHERE nominations.id = ?
          `,
          [req.body.nominationId],
        ),
      );

      await connection.query('DELETE FROM beatmapset_creators WHERE nomination_id = ?', [
        req.body.nominationId,
      ]);

      const creators: User[] = [];

      if (isStringArray(req.body.creators) && req.body.creators.length > 0) {
        for (const creatorName of req.body.creators) {
          creators.push(
            await res.typedLocals.osu.createOrRefreshUser(creatorName, {
              byName: true,
              storeBanned: true,
            }),
          );
        }

        await connection.query(
          'INSERT INTO beatmapset_creators (creator_id, nomination_id) VALUES ?',
          [creators.map((user) => [user.id, req.body.nominationId])],
        );
      }

      nomination.beatmapset_creators = sortCreators(creators, nomination.beatmapset?.creator_id);
      nomination.creators_state =
        creators.length > 0 ? CreatorsState.good : CreatorsState.unchecked;

      await connection.query('UPDATE nominations SET creators_state = ? WHERE id = ?', [
        nomination.creators_state,
        req.body.nominationId,
      ]);
    });

    res.json(nomination);
  }),
);

router.post(
  '/nomination-edit-moderation',
  isModeratorMiddleware,
  asyncHandler(async (req, res) => {
    await db.query('UPDATE nominations SET moderator_state = ? WHERE id = ?', [
      req.body.state,
      req.body.nominationId,
    ]);

    res.json({
      id: req.body.nominationId,
      moderator_state: req.body.state,
    });
  }),
);

router.delete(
  '/nomination',
  asyncHandler(async (req, res) => {
    const hasRole = currentUserRoles(req, res);

    if (!hasRole([])) {
      const nominator = await db.queryOne(
        `
          SELECT 1
          FROM nomination_nominators
          WHERE nomination_id = ?
            AND nominator_id = ?
        `,
        [req.query.nominationId, res.typedLocals.user.id],
      );

      if (nominator == null) {
        return res.status(403).json({ error: 'Must be a nominator of this map' });
      }
    }

    const childNominations = await db.query<Pick<Nomination, 'game_mode'>>(
      `
        SELECT game_mode
        FROM nominations
        WHERE parent_id = ?
      `,
      [req.query.nominationId],
    );

    if (childNominations.length > 0) {
      const gameModes = childNominations
        .map((nomination) => gameModeLongName(nomination.game_mode))
        .join(', ');

      return res.status(422).json({
        error: `Nomination has children in game mode ${gameModes}`,
      });
    }

    await db.transact(async (connection) => {
      await connection.query('DELETE FROM beatmapset_creators WHERE nomination_id = ?', [
        req.query.nominationId,
      ]);
      await connection.query('DELETE FROM nomination_assignees WHERE nomination_id = ?', [
        req.query.nominationId,
      ]);
      await connection.query('DELETE FROM nomination_description_edits WHERE nomination_id = ?', [
        req.query.nominationId,
      ]);
      await connection.query('DELETE FROM nomination_excluded_beatmaps WHERE nomination_id = ?', [
        req.query.nominationId,
      ]);
      await connection.query('DELETE FROM nomination_nominators WHERE nomination_id = ?', [
        req.query.nominationId,
      ]);
      await connection.query('DELETE FROM nominations WHERE id = ?', [req.query.nominationId]);
    });

    res.status(204).send();
  }),
);

router.post(
  '/update-nomination-order',
  isCaptainMiddleware,
  asyncHandler(async (req, res) => {
    await db.transact((connection) =>
      Promise.all(
        Object.entries(req.body).map(([nominationId, order]) =>
          connection.query(
            `
              UPDATE nominations
              SET \`order\` = ?
              WHERE id = ?
            `,
            [order, nominationId],
          ),
        ),
      ),
    );

    res.status(204).send();
  }),
);

router.post(
  '/update-nominators',
  isCaptainMiddleware,
  asyncHandler(async (req, res) => {
    if (!isIntegerArray(req.body.nominatorIds) || req.body.nominatorIds.length === 0) {
      return res.status(422).json({ error: 'Invalid nominator IDs' });
    }

    await db.transact(async (connection) => {
      await connection.query('DELETE FROM nomination_nominators WHERE nomination_id = ?', [
        req.body.nominationId,
      ]);

      await connection.query(
        'INSERT INTO nomination_nominators (nomination_id, nominator_id) VALUES ?',
        [(req.body.nominatorIds as number[]).map((id) => [req.body.nominationId, id])],
      );
    });

    const nominators = await db.query<User>(
      `
        SELECT users.*
        FROM nomination_nominators
        INNER JOIN users
          ON nomination_nominators.nominator_id = users.id
        WHERE nomination_nominators.nomination_id = ?
      `,
      [req.body.nominationId],
    );

    res.json({
      id: req.body.nominationId,
      nominators: nominators || [],
    });
  }),
);

router.post(
  '/lock-nominations',
  asyncHandler(async (req, res) => {
    if (!isGameMode(req.body.gameMode)) {
      return res.status(422).json({ error: 'Invalid game mode' });
    }

    const hasRole = currentUserRoles(req, res);

    if (!hasRole(Role.newsAuthor) && !hasRole(Role.captain, req.body.gameMode)) {
      return res.status(403).json({ error: 'Must be a news author or captain for this game mode' });
    }

    await db.query(
      'UPDATE round_game_modes SET nominations_locked = ? WHERE round_id = ? AND game_mode = ?',
      [req.body.lock, req.body.roundId, req.body.gameMode],
    );

    res.status(204).send();
  }),
);

router.post(
  '/add-user',
  isAnyRoleMiddleware,
  asyncHandler(async (req, res) => {
    if (typeof req.body.name !== 'string') {
      return res.status(422).json({ error: 'Invalid username' });
    }

    const user = await res.typedLocals.osu.createOrRefreshUser(req.body.name, {
      byName: true,
      storeBanned: !!req.body.storeBanned,
    });

    if (user == null) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  }),
);

router.get(
  '/has-extra-token',
  asyncHandler(async (req, res) => {
    const hasRole = currentUserRoles(req, res);

    if (!hasRole([Role.captain, Role.newsAuthor], undefined, true)) {
      return res.status(403).json({ error: 'Must be a captain or news author' });
    }

    const existingExtraToken = await db.queryOne('SELECT 1 FROM extra_tokens WHERE user_id = ?', [
      res.typedLocals.user.id,
    ]);

    res.json(existingExtraToken != null);
  }),
);

router.get(
  '/forum-opt-in',
  asyncHandler(async (req, res) => {
    const hasRole = currentUserRoles(req, res);

    if (!hasRole([Role.captain, Role.newsAuthor], undefined, true)) {
      return res.status(403).json({ error: 'Must be a captain or news author' });
    }

    const existingExtraToken = await db.queryOne('SELECT 1 FROM extra_tokens WHERE user_id = ?', [
      res.typedLocals.user.id,
    ]);

    if (existingExtraToken != null) {
      return res.status(422).json({ error: 'Already have a forum opt-in token' });
    }

    redirectToAuth(req, res, ['forum.write', 'identify', 'public']);
  }),
);

router.post('/add-round', (req, res) => {
  const hasRole = currentUserRoles(req, res);

  if (!hasRole([Role.captain, Role.newsAuthor])) {
    return res.status(403).json({ error: 'Must be a captain or news author' });
  }

  db.transact(async (connection) => {
    const queryResult = await connection.query('INSERT INTO rounds SET ?', [
      {
        name: 'Unnamed round',
        // BanchoBot if current user is not a news author
        news_author_id: hasRole(Role.newsAuthor, undefined, true) ? res.typedLocals.user.id : 3,
      },
    ]);

    for (const gameMode of gameModes) {
      // TODO: 1 query instead of 4
      await connection.query('INSERT INTO round_game_modes SET ?', [
        {
          game_mode: gameMode,
          round_id: queryResult.insertId,
          voting_threshold: accessSetting(`defaultVotingThreshold.${gameMode}`) ?? 0,
        },
      ]);
    }

    res.json({ id: queryResult.insertId });
  });
});

router.post(
  '/update-round',
  isNewsAuthorMiddleware,
  asyncHandler(async (req, res) => {
    // TODO guards are lazy

    if (!isRecord(req.body.round)) {
      return res.status(422).json({ error: 'Invalid round update params' });
    }

    if (!isRecordArray(req.body.roundGameModes)) {
      return res.status(422).json({ error: 'Invalid round game mode update params' });
    }

    if (!isInteger(req.body.roundId)) {
      return res.status(422).json({ error: 'Invalid round ID' });
    }

    await db.query('UPDATE rounds SET ? WHERE id = ?', [
      pick(req.body.round, [
        'name',
        'news_author_id',
        'news_intro',
        'news_intro_preview',
        'news_outro',
        'news_posted_at',
        'video',
      ]),
      req.body.roundId,
    ]);

    for (const roundGameMode of req.body.roundGameModes) {
      if (
        roundGameMode.video !== null &&
        !(
          typeof roundGameMode.video === 'string' &&
          /^(?:https?:\/\/.+\.mp4|[A-Za-z0-9_-]{11})$/.test(roundGameMode.video)
        )
      ) {
        continue;
      }

      await db.query('UPDATE round_game_modes SET video = ? WHERE round_id = ? AND game_mode = ?', [
        roundGameMode.video,
        req.body.roundId,
        roundGameMode.game_mode,
      ]);
    }

    const round:
      | (Round & {
          game_modes?: Record<GameMode, RoundGameMode>;
          news_author: User;
        })
      | null = await db.queryOneWithGroups<Round & { news_author: User }>(
      `
        SELECT rounds.*, users:news_author
        FROM rounds
        INNER JOIN users
          ON rounds.news_author_id = users.id
        WHERE rounds.id = ?
      `,
      [req.body.roundId],
    );

    if (round == null) {
      throw 'Missing round on round update';
    }

    round.game_modes = groupBy<RoundGameMode['game_mode'], RoundGameMode>(
      await db.query<RoundGameMode>(
        `
          SELECT *
          FROM round_game_modes
          WHERE round_id = ?
        `,
        [req.body.roundId],
      ),
      'game_mode',
      null,
      true,
    ) as Record<RoundGameMode['game_mode'], RoundGameMode>;

    res.json(round);
  }),
);

router.get(
  '/news-authors',
  isNewsAuthorMiddleware,
  asyncHandler(async (_, res) => {
    res.json(
      await db.query<User>(
        `
          SELECT users.*
          FROM users
          INNER JOIN user_roles
            ON users.id = user_roles.user_id
          WHERE user_roles.game_mode = -1
            AND user_roles.role_id = ?
            AND user_roles.alumni = 0
          ORDER BY users.name ASC
        `,
        [Role.newsAuthor],
      ),
    );
  }),
);

router.get(
  '/assignee-candidates',
  asyncHandler(async (_, res) => {
    const usersByRole = groupBy<Role, User>(
      await db.queryWithGroups<Pick<UserRole, 'role_id'> & { user: User }>(
        `
          SELECT user_roles.role_id, users:user
          FROM users
          INNER JOIN user_roles
            ON users.id = user_roles.user_id
          WHERE user_roles.alumni = 0
            AND user_roles.role_id IN (?)
          ORDER BY users.name ASC
        `,
        [[Role.metadata, Role.moderator, Role.newsEditor]],
      ),
      'role_id',
      'user',
    );

    res.json({
      metadata: usersByRole[Role.metadata] ?? [],
      moderator: usersByRole[Role.moderator] ?? [],
      news_editor: usersByRole[Role.newsEditor] ?? [],
    });
  }),
);

router.post(
  '/update-excluded-beatmaps',
  isCaptainMiddleware,
  asyncHandler(async (req, res) => {
    if (!isIntegerArray(req.body.excludedBeatmapIds)) {
      return res.status(422).json({ error: 'Invalid beatmap IDs' });
    }

    const excludedBeatmapIds = req.body.excludedBeatmapIds;

    if (!isInteger(req.body.nominationId)) {
      return res.status(422).json({ error: 'Invalid nomination ID' });
    }

    const beatmaps = await db.query<Pick<Beatmap, 'id'>>(
      `
        SELECT beatmaps.id
        FROM beatmaps
        INNER JOIN nominations
          ON beatmaps.beatmapset_id = nominations.beatmapset_id
            AND beatmaps.game_mode = nominations.game_mode
        WHERE nominations.id = ?
          AND beatmaps.deleted_at IS NULL
      `,
      [req.body.nominationId],
    );

    for (const excludedBeatmapId of excludedBeatmapIds) {
      if (!beatmaps.some((beatmap) => beatmap.id === excludedBeatmapId)) {
        return res.status(404).json({ error: `Beatmap #${excludedBeatmapId} not found` });
      }
    }

    await db.transact(async (connection) => {
      await connection.query('DELETE FROM nomination_excluded_beatmaps WHERE nomination_id = ?', [
        req.body.nominationId,
      ]);
      await connection.query('UPDATE nominations SET difficulties_set = 1 WHERE id = ?', [
        req.body.nominationId,
      ]);

      if (excludedBeatmapIds.length > 0) {
        await connection.query(
          'INSERT INTO nomination_excluded_beatmaps (beatmap_id, nomination_id) VALUES ?',
          [excludedBeatmapIds.map((id) => [id, req.body.nominationId])],
        );
      }
    });

    res.json({ id: req.body.nominationId, difficulties_set: true });
  }),
);

router.post(
  '/update-nomination-assignees',
  asyncHandler(async (req, res) => {
    const typeRoles: Record<AssigneeType, Role> = {
      metadata: Role.metadata,
      moderator: Role.moderator,
      news_editor: Role.newsEditor,
    } as const;
    const typeNames: Record<AssigneeType, string> = {
      metadata: 'metadata',
      moderator: 'moderator',
      news_editor: 'news editor',
    };

    if (!isAssigneeType(req.body.type)) {
      return res.status(422).json({ error: 'Invalid assignee type' });
    }

    const hasRole = currentUserRoles(req, res);

    if (!hasRole([Role.newsAuthor, typeRoles[req.body.type]])) {
      return res
        .status(403)
        .json({ error: `Must have ${typeNames[req.body.type]} or news author role` });
    }

    await db.transact(async (connection) => {
      await connection.query(
        `
          DELETE FROM nomination_assignees
          WHERE nomination_id = ?
            AND type = ?
        `,
        [req.body.nominationId, req.body.type],
      );

      if (isIntegerArray(req.body.assigneeIds) && req.body.assigneeIds.length > 0) {
        await connection.query(
          'INSERT INTO nomination_assignees (assignee_id, nomination_id, type) VALUES ?',
          [req.body.assigneeIds.map((id) => [id, req.body.nominationId, req.body.type])],
        );
      }
    });

    const assignees = await db.query<User>(
      `
        SELECT users.*
        FROM nomination_assignees
        INNER JOIN users
          ON nomination_assignees.assignee_id = users.id
        WHERE nomination_assignees.nomination_id = ?
          AND nomination_assignees.type = ?
      `,
      [req.body.nominationId, req.body.type],
    );

    res.json({
      id: req.body.nominationId,
      [`${req.body.type}_assignees`]: assignees,
    });
  }),
);

router.post(
  '/mark-pack-uploaded',
  isPackUploaderMiddleware,
  asyncHandler(async (req, res) => {
    const round = await db.queryOne<Round>('SELECT * FROM rounds WHERE id = ?', [
      req.query.roundId,
    ]);

    if (round == null) {
      return res.status(404).json({ error: 'Round not found' });
    }

    if (round.done) {
      return res.status(422).json({ error: 'Round marked as done' });
    }

    if (round.ignore_packs_checks) {
      return res.status(422).json({ error: 'Round ignores packs checks' });
    }

    const roundGameModes = await db.query<RoundGameMode>(
      'SELECT * FROM round_game_modes WHERE round_id = ?',
      [round.id],
    );

    if (roundGameModes.length === 0) {
      return res.status(404).json({ error: 'Round rulesets not found' });
    }

    if (
      roundGameModes.every((roundGameMode) => roundGameMode.pack_state === PacksState.uploadedFinal)
    ) {
      return res
        .status(422)
        .json({ error: 'Final pack uploads have already been marked on this round' });
    }

    const nominationsByRuleset = groupBy<
      Nomination['game_mode'],
      Nomination & {
        beatmapset: Beatmapset;
        poll: Poll | null;
      }
    >(
      await db.queryWithGroups<
        Nomination & {
          beatmapset: Beatmapset;
          poll: Poll | null;
        }
      >(
        `
          SELECT nominations.*, beatmapsets:beatmapset, polls:poll
          FROM nominations
          INNER JOIN beatmapsets
            ON nominations.beatmapset_id = beatmapsets.id
          LEFT JOIN polls
            ON nominations.round_id = polls.round_id
              AND nominations.game_mode = polls.game_mode
              AND nominations.beatmapset_id = polls.beatmapset_id
          WHERE nominations.round_id = ?
        `,
        [round.id],
      ),
      'game_mode',
    );

    for (const roundGameMode of roundGameModes) {
      roundGameMode.pack_state = nominationsByRuleset[roundGameMode.game_mode]?.every(
        (nomination) =>
          nomination.poll != null &&
          nomination.poll.result_no != null &&
          nomination.poll.result_yes != null &&
          (nomination.beatmapset.ranked_status === RankedStatus.loved ||
            nomination.poll.result_yes / (nomination.poll.result_no + nomination.poll.result_yes) <
              roundGameMode.voting_threshold),
      )
        ? PacksState.uploadedFinal
        : PacksState.uploadedInitial;
    }

    const allRulesetsFinal = roundGameModes.every(
      (roundGameMode) => roundGameMode.pack_state === PacksState.uploadedFinal,
    );

    await db.transact(async (connection) => {
      for (const roundGameMode of roundGameModes) {
        await connection.query(
          'UPDATE round_game_modes SET pack_state = ? WHERE round_id = ? AND game_mode = ?',
          [roundGameMode.pack_state, roundGameMode.round_id, roundGameMode.game_mode],
        );
      }

      if (allRulesetsFinal) {
        await connection.query('UPDATE rounds SET done = 1 WHERE id = ?', [round.id]);
      }
    });

    res.json({
      id: round.id,
      done: allRulesetsFinal,
      game_modes: groupBy<RoundGameMode['game_mode'], RoundGameMode>(
        roundGameModes,
        'game_mode',
        null,
        true,
      ),
    });
  }),
);

router.get(
  '/users-with-permissions',
  asyncHandler(async (_, res) => {
    const userRolesByUserId = groupBy<UserRole['user_id'], UserRole>(
      await db.query<UserRole>(`
        SELECT *
        FROM user_roles
        ORDER BY alumni ASC, role_id ASC
      `),
      'user_id',
    );
    const users = await db.query<UserWithRoles>(
      `
        SELECT *
        FROM users
        WHERE id IN (?)
        ORDER BY name ASC
      `,
      [Object.keys(userRolesByUserId)],
    );

    for (const user of users) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      user.roles = userRolesByUserId[user.id]!;
    }

    users.sort(
      (a, b) => +a.roles.every((role) => role.alumni) - +b.roles.every((role) => role.alumni),
    );

    res.json(users);
  }),
);

router.post(
  '/update-permissions',
  isAnyRoleMiddleware,
  asyncHandler(async (req, res) => {
    if (!isUserRoleWithoutUserIdArray(req.body.roles)) {
      return res.status(422).json({ error: 'Invalid roles' });
    }

    if (!isInteger(req.body.userId)) {
      return res.status(422).json({ error: 'Invalid user ID' });
    }

    if (
      req.body.roles.some(
        (role) => role.alumni && (role.role_id === Role.admin || role.role_id === Role.spectator),
      )
    ) {
      return res.status(422).json({ error: 'Cannot set alumni status for admin or spectator' });
    }

    if (
      req.body.roles.some((role) => !role.alumni && role.role_id === Role.newsAuthor) &&
      !req.body.roles.some((role) => !role.alumni && role.role_id === Role.newsEditor)
    ) {
      return res.status(422).json({ error: 'Cannot set news author without news editor' });
    }

    if (
      req.body.roles.some((role) => (role.role_id === Role.captain) === (role.game_mode === -1))
    ) {
      return res.status(422).json({ error: 'Invalid game modes on roles' });
    }

    const user = await db.queryOne<User>('SELECT * FROM users WHERE id = ?', [req.body.userId]);

    if (user == null) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRoles = await db.query<UserRole>('SELECT * FROM user_roles WHERE user_id = ?', [
      user.id,
    ]);

    if (
      !userRoles.some((role) => !role.alumni && role.role_id === Role.admin) &&
      req.body.roles.some((role) => !role.alumni && role.role_id === Role.admin)
    ) {
      return res.status(422).json({
        error:
          'Cannot add admin role. If you are a developer, use the "create-admin" script instead',
      });
    }

    // If the user had a captain or news author role but doesn't anymore, revoke
    // and delete their forum.write osu! API token.
    //
    // TODO: Should only delete the token if forum.write is the only scope (this
    //       is currently true for all extra_tokens).
    let extraTokenToDelete: ExtraToken | null | undefined;

    if (
      userRoles.some(
        (role) =>
          !role.alumni && (role.role_id === Role.captain || role.role_id === Role.newsAuthor),
      ) &&
      !req.body.roles.some(
        (role) =>
          !role.alumni && (role.role_id === Role.captain || role.role_id === Role.newsAuthor),
      )
    ) {
      extraTokenToDelete = await db.queryOne<ExtraToken>(
        'SELECT * FROM extra_tokens WHERE user_id = ?',
        [user.id],
      );
    }

    const logActor = dbLogUser(res.typedLocals.user);
    const logUser = dbLogUser(user);

    await db.transact(async (connection) => {
      // If an extra API token was marked for deletion, delete it here.
      if (extraTokenToDelete != null) {
        await connection.query('DELETE FROM extra_tokens WHERE user_id = ?', [user.id]);
        await dbLog(
          LogType.extraTokenDeleted,
          {
            actor: logActor,
            scopes: (extraTokenToDelete.token.scopes ?? []).filter(
              (scope) => scope !== 'identify' && scope !== 'public',
            ),
            user: logUser,
          },
          connection,
        );
      }

      for (const newRole of req.body.roles as Omit<UserRole, 'user_id'>[]) {
        const existingRole = userRoles.find(
          (role) => role.game_mode === newRole.game_mode && role.role_id === newRole.role_id,
        );

        if (existingRole == null) {
          await dbLog(
            LogType.roleCreated,
            {
              actor: logActor,
              role: newRole,
              user: logUser,
            },
            connection,
          );
        } else if (existingRole.alumni !== newRole.alumni) {
          await dbLog(
            LogType.roleToggledAlumni,
            {
              actor: logActor,
              role: newRole,
              user: logUser,
            },
            connection,
          );
        }
      }

      for (const deletedRole of userRoles.filter(
        (role) =>
          (req.body.roles as Omit<UserRole, 'user_id'>[]).find(
            (newRole) => role.game_mode === newRole.game_mode && role.role_id === newRole.role_id,
          ) == null,
      )) {
        await dbLog(
          LogType.roleDeleted,
          {
            actor: logActor,
            role: deletedRole,
            user: logUser,
          },
          connection,
        );
      }

      await connection.query('DELETE FROM user_roles WHERE user_id = ?', [req.body.userId]);

      if ((req.body.roles as Omit<UserRole, 'user_id'>[]).length > 0) {
        await connection.query(
          'INSERT INTO user_roles (game_mode, role_id, user_id, alumni) VALUES ?',
          [
            (req.body.roles as Omit<UserRole, 'user_id'>[]).map((role) => [
              role.game_mode,
              role.role_id,
              req.body.userId,
              role.alumni,
            ]),
          ],
        );
      }
    });

    // If an extra API token was marked for deletion, revoke it here. The token
    // has already been deleted from the database and won't be used beyond here,
    // so ignore any errors from the osu! API.
    if (extraTokenToDelete != null) {
      try {
        await new Osu(extraTokenToDelete.token).revokeToken();
      } catch {}
    }

    res.status(204).send();
  }),
);

router.post(
  '/update-api-object',
  isAnyRoleMiddleware,
  asyncHandler(async (req, res) => {
    if (!isInteger(req.body.id)) {
      return res.status(422).json({ error: 'Invalid ID' });
    }

    if (req.body.type !== 'beatmapset' && req.body.type !== 'user') {
      return res.status(422).json({ error: 'Invalid type' });
    }

    // TODO: Shouldn't log outside of transaction like this
    await dbLog(LogType.apiUpdateForced, {
      actor: dbLogUser(res.typedLocals.user),
      objectId: req.body.id,
      objectType: req.body.type,
    });

    let apiObject;

    switch (req.body.type) {
      case 'beatmapset':
        apiObject = await res.typedLocals.osu.createOrRefreshBeatmapset(req.body.id, true);
        break;
      case 'user':
        // TODO: Store banned only if some box is ticked on web form
        apiObject = await res.typedLocals.osu.createOrRefreshUser(req.body.id, {
          forceUpdate: true,
          storeBanned: true,
        });
        break;
    }

    if (apiObject == null) {
      return res.status(404).json({ error: 'API object not found' });
    }

    res.status(204).send();
  }),
);

router.post('/update-api-object-bulk', isAnyRoleMiddleware, (req, res) => {
  if (!isIntegerArray(req.body.ids)) {
    return res.status(422).json({ error: 'Invalid IDs' });
  }

  if (req.body.type !== 'beatmapset' && req.body.type !== 'user') {
    return res.status(422).json({ error: 'Invalid type' });
  }

  let apiObject;
  const type = req.body.type;
  const bulkOsu = new Osu();

  (async () => {
    await bulkOsu.getClientCredentialsToken();

    for (const id of req.body.ids) {
      // TODO: Shouldn't log outside of transaction like this
      await dbLog(LogType.apiUpdateForced, {
        actor: dbLogUser(res.typedLocals.user),
        objectId: id,
        objectType: type,
      });

      switch (type) {
        case 'beatmapset':
          apiObject = await bulkOsu.createOrRefreshBeatmapset(id, true);
          break;
        case 'user':
          // TODO: Store banned only if some box is ticked on web form
          apiObject = await bulkOsu.createOrRefreshUser(id, {
            forceUpdate: true,
            storeBanned: true,
          });
          break;
      }

      if (apiObject == null) {
        systemLog(`Could not update ${id} from bulk request`, SyslogLevel.warning);
      } else {
        systemLog(`Updated object ${id} from bulk request`, SyslogLevel.info);
      }
    }

    await bulkOsu.revokeToken();
  })();

  res.status(204).send();
});

router.delete(
  '/beatmapset',
  isAnyRoleMiddleware,
  asyncHandler(async (req, res) => {
    const id = req.query.beatmapsetId;
    const beatmapset = await db.queryOne<Beatmapset>('SELECT * FROM beatmapsets WHERE id = ?', [
      id,
    ]);

    if (beatmapset == null || beatmapset.deleted_at != null) {
      return res.status(404).json({ error: 'Beatmapset not found' });
    }

    const nomination = await db.queryOne('SELECT 1 FROM nominations WHERE beatmapset_id = ?', [id]);
    const poll = await db.queryOne('SELECT 1 FROM polls WHERE beatmapset_id = ?', [id]);

    if (nomination != null || poll != null) {
      return res.status(422).json({ error: 'Beatmapset has nominations or polls attached' });
    }

    const logActor = dbLogUser(res.typedLocals.user);
    const logBeatmapset = dbLogBeatmapset(beatmapset);
    const consentBeatmapsets = await db.queryWithGroups<
      Pick<ConsentBeatmapset, 'consent' | 'consent_reason'> & { user: User }
    >(
      `
        SELECT mapper_consent_beatmapsets.consent, mapper_consent_beatmapsets.consent_reason, users:user
        FROM mapper_consent_beatmapsets
        INNER JOIN users
          ON mapper_consent_beatmapsets.user_id = users.id
        WHERE mapper_consent_beatmapsets.beatmapset_id = ?
      `,
      [beatmapset.id],
    );
    const reviews = await db.queryWithGroups<
      Pick<Review, 'game_mode' | 'id' | 'reason' | 'score'> & { user: User }
    >(
      `
        SELECT reviews.game_mode, reviews.id, reviews.reason, reviews.score, users:user
        FROM reviews
        INNER JOIN users
          ON reviews.reviewer_id = users.id
        WHERE reviews.beatmapset_id = ?
      `,
      [beatmapset.id],
    );
    const submissions = await db.queryWithGroups<
      Pick<Submission, 'game_mode' | 'id' | 'reason'> & { user: User | null }
    >(
      `
        SELECT submissions.game_mode, submissions.id, submissions.reason, users:user
        FROM submissions
        LEFT JOIN users
          ON submissions.submitter_id = users.id
        WHERE submissions.beatmapset_id = ?
      `,
      [beatmapset.id],
    );

    await db.transact(async (connection) => {
      await connection.query('DELETE FROM beatmaps WHERE beatmapset_id = ?', [id]);
      await connection.query('DELETE FROM mapper_consent_beatmapsets WHERE beatmapset_id = ?', [
        id,
      ]);
      await connection.query('DELETE FROM reviews WHERE beatmapset_id = ?', [id]);
      await connection.query('DELETE FROM submissions WHERE beatmapset_id = ?', [id]);

      await connection.query('DELETE FROM beatmapsets WHERE id = ?', [id]);

      for (const consentBeatmapset of consentBeatmapsets) {
        await dbLog(
          LogType.mapperConsentBeatmapsetDeleted,
          {
            actor: logActor,
            beatmapset: logBeatmapset,
            consent: consentBeatmapset.consent,
            reason: consentBeatmapset.consent_reason,
            user: dbLogUser(consentBeatmapset.user),
          },
          connection,
        );
      }

      for (const review of reviews) {
        await dbLog(
          LogType.reviewDeleted,
          {
            actor: logActor,
            beatmapset: logBeatmapset,
            review: dbLogReview(review),
            user: dbLogUser(review.user),
          },
          connection,
        );
      }

      for (const submission of submissions) {
        await dbLog(
          LogType.submissionDeleted,
          {
            actor: logActor,
            beatmapset: logBeatmapset,
            submission: dbLogSubmission(submission),
            user: submission.user == null ? undefined : dbLogUser(submission.user),
          },
          connection,
        );
      }

      await dbLog(
        LogType.beatmapsetDeleted,
        { actor: logActor, beatmapset: logBeatmapset },
        connection,
      );
    });

    deleteCache('mapper-consents');
    deleteCache('submissions:mapper-consent-beatmapsets');
    for (const gameMode of gameModes) {
      deleteCache(`submissions:${gameMode}:reviews`);
    }

    res.status(204).send();
  }),
);

router.get('/settings', isCaptainMiddleware, (_, res) => {
  res.json(settings);
});

router.put(
  '/settings',
  isCaptainMiddleware,
  asyncHandler(async (req, res) => {
    const modifiedSettings = updateSettings(req.body);

    await db.transact(async (connection) => {
      for (const setting of modifiedSettings) {
        await dbLog(
          LogType.settingUpdated,
          {
            actor: dbLogUser(res.typedLocals.user),
            setting,
          },
          connection,
        );
      }
    });

    res.json(settings);
  }),
);

// Not semantically POST but I want request body.
router.post(
  '/logs',
  asyncHandler(async (req, res) => {
    if (!isInteger(req.body.page) || req.body.page < 1) {
      return res.status(422).json({ error: 'Invalid page' });
    }

    if (!isLogTypeArray(req.body.types)) {
      return res.status(422).json({ error: 'Invalid log types' });
    }

    const pageSize = 100;
    const offset = (req.body.page - 1) * pageSize;
    const skipWhere = req.body.types.length === 0;

    res.json({
      logs: await db.query<Log>(
        `
          SELECT *
          FROM logs
          WHERE type NOT IN (${LogType.loggedIn}, ${LogType.loggedOut})
          ${skipWhere ? '' : 'AND type IN (?)'}
          ORDER BY id DESC
          LIMIT ? OFFSET ?
        `,
        skipWhere ? [pageSize, offset] : [req.body.types, pageSize, offset],
      ),
      pageSize,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      total: (await db.queryOne<{ count: number }>(
        `
          SELECT COUNT(*) AS count
          FROM logs
          WHERE type NOT IN (${LogType.loggedIn}, ${LogType.loggedOut})
          ${skipWhere ? '' : 'AND type IN (?)'}
        `,
        skipWhere ? undefined : [req.body.types],
      ))!.count,
    });
  }),
);

router.get(
  '/interop-key',
  isNewsAuthorMiddleware,
  asyncHandler(async (_, res) => {
    const interopKey = await db.queryOne<Pick<InteropKey, 'key'>>(
      'SELECT `key` FROM interop_keys WHERE user_id = ?',
      [res.typedLocals.user.id],
    );

    res.json(interopKey?.key ?? null);
  }),
);

router.post(
  '/interop-key',
  isNewsAuthorMiddleware,
  asyncHandler(async (_, res) => {
    let key: string;

    for (;;) {
      key = randomBytes(48).toString('base64');

      const existingInteropKey = await db.queryOne('SELECT 1 FROM interop_keys WHERE `key` = ?', [
        key,
      ]);

      if (existingInteropKey == null) {
        break;
      }
    }

    await db.query(
      `
        INSERT INTO interop_keys SET ?
        ON DUPLICATE KEY UPDATE ?
      `,
      [{ key, user_id: res.typedLocals.user.id }, { key }],
    );

    res.json(key);
  }),
);

router.get(
  '/video-assets',
  asyncHandler(async (req, res) => {
    const hasRole = currentUserRoles(req, res);

    if (!hasRole(Role.video)) {
      return res.status(403).json({ error: 'Must have video editor role' });
    }

    const round = await db.queryOne<Round>('SELECT * FROM rounds WHERE id = ?', [
      req.query.roundId,
    ]);

    if (round == null) {
      return res.status(404).json({ error: 'Round not found' });
    }

    if (round.done) {
      return res.status(422).json({ error: 'Round must be in-progress' });
    }

    const beatmapsetCreatorsByNominationId = groupBy<Nomination['id'], User>(
      await db.queryWithGroups<{
        creator: User;
        nomination_id: Nomination['id'];
      }>(
        `
          SELECT nominations.id AS nomination_id, creators:creator
          FROM nominations
          INNER JOIN beatmapset_creators
            ON nominations.id = beatmapset_creators.nomination_id
          INNER JOIN users AS creators
            ON beatmapset_creators.creator_id = creators.id
          WHERE nominations.round_id = ?
        `,
        [round.id],
      ),
      'nomination_id',
      'creator',
    );
    const nominations: (Nomination & {
      beatmapset: Beatmapset;
      beatmapset_creators?: User[];
      positionInRuleset?: number;
    })[] = await db.queryWithGroups<
      Nomination & {
        beatmapset: Beatmapset;
      }
    >(
      `
        SELECT nominations.*, beatmapsets:beatmapset
        FROM nominations
        INNER JOIN beatmapsets
          ON nominations.beatmapset_id = beatmapsets.id
        WHERE nominations.round_id = ?
        ORDER BY nominations.order ASC, nominations.id ASC
      `,
      [round.id],
    );

    const rulesetPositionCounters = [0, 0, 0, 0];

    nominations.forEach((nomination) => {
      nomination.beatmapset_creators = sortCreators(
        beatmapsetCreatorsByNominationId[nomination.id] || [],
        nomination.beatmapset.creator_id,
      );
      nomination.positionInRuleset = ++rulesetPositionCounters[nomination.game_mode];
    });

    // Set up archive in storage
    const storagePath = normalize(config.storagePath);

    if (!existsSync(storagePath)) {
      mkdirSync(storagePath);
    }

    const now = Date.now();
    const archivePath = join(storagePath, `video-assets-${res.typedLocals.user.id}-${now}.zip`);
    const archiveStream = createWriteStream(archivePath);
    const archive = archiver('zip');

    // When the archive is ready, send the file as a response
    archiveStream.on('close', () => {
      res.sendFile(
        archivePath,
        {
          headers: {
            'Content-Disposition': `attachment; filename="Round #${round.id} video assets"`,
          },
        },
        (error) => {
          unlinkSync(archivePath);

          if (error) {
            throw error;
          }
        },
      );
    });

    archive.on('error', (error) => {
      throw error;
    });

    archive.pipe(archiveStream);

    // Add background images to archive
    for (const nomination of nominations) {
      const coverImage = await superagent
        .get(
          `https://assets.ppy.sh/beatmaps/${nomination.beatmapset.id}/covers/fullsize.jpg?${now}`,
        )
        .ok((response) => response.status === 200)
        .then((response) => response.body)
        .catch((error) => {
          if (isResponseError(error) && error.status === 404) {
            return null;
          }

          throw error;
        });

      if (coverImage != null) {
        archive.append(coverImage, {
          name: `${gameModeShortName(nomination.game_mode)}-${String(nomination.positionInRuleset).padStart(2, '0')} (#${nomination.beatmapset.id}).jpg`,
        });
      }
    }

    // Add helper info file to archive
    archive.append(
      `### Round #${round.id} info\n` +
        '###\n' +
        '### Format:\n' +
        '###\n' +
        '### Beatmapset #<id>\n' +
        '### <artist> - <title>\n' +
        '### <artist>\n' +
        '### <title>\n' +
        '### <mapper (host)>\n' +
        '### <mappers>\n\n\n\n' +
        gameModes
          .map(
            (gameMode) =>
              `### ${gameModeLongName(gameMode)}\n\n` +
              nominations
                .filter((nomination) => nomination.game_mode === gameMode)
                .map((nomination) =>
                  [
                    `Beatmapset #${nomination.beatmapset_id}`,
                    `${nomination.beatmapset.artist} - ${nomination.beatmapset.title}`,
                    nomination.beatmapset.artist,
                    nomination.beatmapset.title,
                    nomination.beatmapset.creator_name,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    joinList(nomination.beatmapset_creators!.map((user) => user.name)),
                  ].join('\n'),
                )
                .join('\n\n'),
          )
          .join('\n\n\n\n'),
      { name: 'info.txt' },
    );

    await archive.finalize();
  }),
);
