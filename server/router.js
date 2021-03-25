const express = require('express');
const db = require('./db');
const { asyncHandler } = require('./express-helpers');
const guards = require('./guards');
const { groupBy } = require('./helpers');
const { log, logTypes } = require('./log');
const { createOrRefreshBeatmapset, createOrRefreshUser } = require('./osu');

function getParams(object, keys) {
  const params = {};

  for (const key of keys)
    if (object[key] !== undefined)
      params[key] = object[key];

  return params;
}

const router = express.Router();
// TODO: rethink guards. also, public/interop gets should be available to people not signed in

//#region public
router.post('/map-submit', asyncHandler(async (req, res) => {
  // TODO: log me!
}));

router.get('/captains', asyncHandler(async (req, res) => {
  const captains = await db.queryWithGroups(`
    SELECT users.*, user_roles:roles
    FROM users
    INNER JOIN user_roles
      ON users.id = user_roles.id
    WHERE user_roles.captain_game_mode IS NOT NULL
    ORDER BY users.name ASC
  `);

  res.json(captains);
}));
//#endregion

//#region interop
router.get('/local-interop/data', guards.hasLocalInterOpKey, asyncHandler(async (req, res) => {
  const round = await db.queryOne(`
    SELECT *
    FROM rounds
    WHERE id = ?
  `, req.query.roundId);

  const nominations = await db.query(`
    SELECT *
    FROM nominations
    WHERE round_id = ?
  `, req.query.roundId);

  res.json({
    nominations,
    round,
  });
}));

router.get('/local-interop/rounds-available', guards.hasLocalInterOpKey, asyncHandler(async (_, res) => {
  const rounds = await db.query(`
    SELECT *
    FROM rounds
    WHERE done = 0
    ORDER BY id DESC
  `);

  res.json(rounds);
}));
//#endregion

//#region captain
router.get('/rounds', asyncHandler(async (req, res) => {
  const rounds = await db.query(`
    SELECT rounds.*, IFNULL(nomination_counts.count, 0) AS nomination_count
    FROM rounds
    LEFT JOIN (
      SELECT COUNT(*) AS count, round_id
      FROM nominations
      GROUP BY round_id
    ) AS nomination_counts
      ON rounds.id = nomination_counts.round_id
    ORDER BY rounds.id ASC
    ${db.pageQuery(req)}
  `); // TODO: active rounds idASC at the top, inactive rounds idDESC at bottom

  res.json(rounds);
}));

router.get('/nominations', asyncHandler(async (req, res) => {
  const round = await db.queryOne(`
    SELECT *
    FROM rounds
    WHERE id = ?
  `, req.query.roundId);

  const includesByNominationId = groupBy(
    await db.queryWithGroups(`
      SELECT nominations.id AS nomination_id, creators:creator, beatmaps:beatmap, nomination_excluded_beatmaps.beatmap_id IS NOT NULL AS 'beatmap:excluded'
      FROM nominations
      LEFT JOIN beatmapset_creators
        ON nominations.beatmapset_id = beatmapset_creators.beatmapset_id
          AND nominations.game_mode = beatmapset_creators.game_mode
      LEFT JOIN users AS creators
        ON beatmapset_creators.creator_id = creators.id
      LEFT JOIN nomination_excluded_beatmaps
        ON nominations.id = nomination_excluded_beatmaps.nomination_id
      LEFT JOIN beatmaps
        ON nominations.beatmapset_id = beatmaps.beatmapset_id
      WHERE nominations.round_id = ?
    `, req.query.roundId),
    'nomination_id',
  );
  const nominations = await db.queryWithGroups(`
    SELECT nominations.*, beatmapsets:beatmapset, description_authors:description_author,
      metadata_assignees:metadata_assignee, moderator_assignees:moderator_assignee,
      nominators:nominator
    FROM nominations
    INNER JOIN beatmapsets
      ON nominations.beatmapset_id = beatmapsets.id
    LEFT JOIN users AS description_authors
      ON nominations.description_author_id = description_authors.id
    LEFT JOIN users AS metadata_assignees
      ON nominations.metadata_assignee_id = metadata_assignees.id
    LEFT JOIN users AS moderator_assignees
      ON nominations.moderator_assignee_id = moderator_assignees.id
    INNER JOIN users AS nominators
      ON nominations.nominator_id = nominators.id
    WHERE nominations.round_id = ?
  `, req.query.roundId);

  nominations.forEach((nomination) => {
    nomination.beatmaps = includesByNominationId[nomination.id]
      .map((include) => include.beatmap).filter((beatmap) => beatmap != null);
    nomination.beatmapset_creators = includesByNominationId[nomination.id]
      .map((include) => include.creator)
      .filter((c1, i, all) => c1 != null && all.findIndex((c2) => c1.id === c2.id) === i);
  });

  res.json({
    nominations,
    round,
  });
}));

router.post('/nomination-submit', asyncHandler(async (req, res) => {
  // TODO: can this be done with foreign constraint instead?
  if (req.body.parentId != null) {
    const parentNominations = await db.query(`
      SELECT 1
      FROM nominations
      WHERE id = ?
    `, req.body.parentId);

    if (parentNominations.length !== 1)
      return res.status(422).json({ error: 'Invalid parent nomination ID' });
  }

  const beatmapset = await createOrRefreshBeatmapset(req.session.accessToken, req.body.beatmapsetId, req.body.gameMode);
  const queryResult = await db.query('INSERT INTO nominations SET ?', {
    beatmapset_id: beatmapset.id,
    game_mode: req.body.gameMode,
    nominator_id: res.locals.user.id,
    parent_id: req.body.parentId,
    round_id: req.body.roundId,
  });

  const creators = await db.query(`
    SELECT users.*
    FROM beatmapset_creators
    INNER JOIN nominations
      ON beatmapset_creators.beatmapset_id = nominations.beatmapset_id
        AND beatmapset_creators.game_mode = nominations.game_mode
    INNER JOIN users
      ON beatmapset_creators.creator_id = users.id
    WHERE nominations.id = ?
  `, queryResult.insertId);
  const nomination = await db.queryOneWithGroups(`
    SELECT nominations.*, NULL AS description_author, NULL AS metadata_assignee,
      NULL AS moderator_assignee, nominators:nominator
    FROM nominations
    INNER JOIN users AS nominators
      ON nominations.nominator_id = nominators.id
    WHERE nominations.id = ?
  `, queryResult.insertId);
  const beatmaps = await db.query(`
    SELECT beatmaps.*, FALSE AS excluded
    FROM beatmaps
    WHERE beatmaps.beatmapset_id = ?
  `, nomination.beatmapset_id);

  nomination.beatmaps = beatmaps;
  nomination.beatmapset = beatmapset;
  nomination.beatmapset_creators = creators || [];

  // TODO: log me!

  res.json(nomination);
}));

router.post('/nomination-edit-description', asyncHandler(async (req, res) => {
  const { description: prevDescription, description_author_id: prevAuthorId } = await db.queryOne(`
    SELECT description, description_author_id
    FROM nominations
    WHERE id = ?
  `, req.body.nominationId);

  await db.query(`
    UPDATE nominations
    SET description = ?, description_author_id = ?
    WHERE id = ?
  `, [
    req.body.description,
    req.body.description == null ? null : prevDescription == null ? res.locals.user.id : prevAuthorId,
    req.body.nominationId,
  ]);

  const nomination = await db.queryOneWithGroups(`
    SELECT nominations.id, nominations.description,
      nominations.description_author_id, description_authors:description_author
    FROM nominations
    INNER JOIN users AS description_authors
      ON nominations.description_author_id = description_authors.id
    WHERE nominations.id = ?
  `, req.body.nominationId);

  res.json(nomination);
}));

router.post('/nomination-edit-metadata', guards.isMetadataChecker, asyncHandler(async (req, res) => {
  await db.query(`
    UPDATE nominations
    SET metadata_state = ?, overwrite_artist = ?, overwrite_title = ?
    WHERE id = ?
  `, [
    req.body.state,
    req.body.artist,
    req.body.title,
    req.body.nominationId,
  ]);

  const nomination = await db.queryOne(`
    SELECT id, metadata_state, overwrite_artist, overwrite_title
    FROM nominations
    WHERE id = ?
  `, req.body.nominationId);

  res.json(nomination);
}));

router.delete('/nomination', asyncHandler(async (req, res) => {
  await db.query(`
    DELETE FROM nominations
    WHERE id = ?
  `, req.query.nominationId);

  res.status(204).send();
}));
//#endregion

//#region admin
router.post('/add-user', guards.isGod, asyncHandler(async (req, res) => {
  const user = await createOrRefreshUser(req.session.accessToken, req.body.name);

  await db.query('INSERT IGNORE INTO user_roles SET id = ?', user.id);

  const roles = await db.queryOne(`
    SELECT *
    FROM user_roles
    WHERE id = ?
  `, user.id);
  delete roles.id;

  res.json({
    ...user,
    roles,
  });
}));

router.post('/add-round', guards.isGod, asyncHandler(async (req, res) => {
  const queryResult = await db.query('INSERT INTO rounds SET ?', {
    name: req.body.name,
    news_posted_at: new Date(req.body.news_posted_at),
  });
  const round = await db.queryOne(`
    SELECT rounds.*, IFNULL(nomination_counts.count, 0) AS nomination_count
    FROM rounds
    LEFT JOIN (
      SELECT COUNT(*) AS count, round_id
      FROM nominations
      WHERE round_id = ?
    ) AS nomination_counts
      ON rounds.id = nomination_counts.round_id
    WHERE rounds.id = ?
  `, [queryResult.insertId, queryResult.insertId]);

  res.json(round);
}));

router.get('/mapper-consents', guards.isAnything, asyncHandler(async (req, res) => {
  const consents = await db.queryWithGroups(`
    SELECT mapper_consents.*, mappers:mapper, updaters:updater
    FROM mapper_consents
    INNER JOIN users AS mappers
      ON mapper_consents.id = mappers.id
    INNER JOIN users AS updaters
      ON mapper_consents.updater_id = updaters.id
    ORDER BY mapper.name ASC
    ${db.pageQuery(req)}
  `);

  res.json(consents);
}));

router.get('/assignees', asyncHandler(async (_, res) => {
  const metadatas = await db.query(`
    SELECT users.*
    FROM users
    INNER JOIN user_roles
      ON users.id = user_roles.id
    WHERE user_roles.metadata = 1
  `);
  const moderators = await db.query(`
    SELECT users.*
    FROM users
    INNER JOIN user_roles
      ON users.id = user_roles.id
    WHERE user_roles.moderator = 1
  `);

  res.json({
    metadatas,
    moderators,
  });
}));

router.post('/update-excluded-beatmaps', guards.isCaptain, asyncHandler(async (req, res) => {
  await db.query('DELETE FROM nomination_excluded_beatmaps WHERE nomination_id = ?', req.body.nominationId);

  if (req.body.excludedBeatmapIds != null && req.body.excludedBeatmapIds.length > 0)
    await db.query('INSERT INTO nomination_excluded_beatmaps VALUES ?', [req.body.excludedBeatmapIds.map((id) => [id, req.body.nominationId])]);

  res.status(204).send();
}));

router.post('/update-metadata-assignee', guards.isMetadataChecker, asyncHandler(async (req, res) => {
  await db.query(`
    UPDATE nominations
    SET metadata_assignee_id = ?
    WHERE id = ?
  `, [
    req.body.assigneeId,
    req.body.nominationId,
  ]);

  const nomination = await db.queryOneWithGroups(`
    SELECT nominations.id, nominations.metadata_assignee_id, metadata_assignees:metadata_assignee
    FROM nominations
    LEFT JOIN users AS metadata_assignees
      ON nominations.metadata_assignee_id = metadata_assignees.id
    WHERE nominations.id = ?
  `, req.body.nominationId);

  res.json(nomination);
}));

router.post('/update-moderator-assignee', guards.isModerator, asyncHandler(async (req, res) => {
  await db.query(`
    UPDATE nominations
    SET moderator_assignee_id = ?
    WHERE id = ?
  `, [
    req.body.assigneeId,
    req.body.nominationId,
  ]);

  const nomination = await db.queryOneWithGroups(`
    SELECT nominations.id, nominations.moderator_assignee_id, moderator_assignees:moderator_assignee
    FROM nominations
    LEFT JOIN users AS moderator_assignees
      ON nominations.moderator_assignee_id = moderator_assignees.id
    WHERE nominations.id = ?
  `, req.body.nominationId);

  res.json(nomination);
}));

router.get('/users-with-permissions', asyncHandler(async (_, res) => {
  const queryResult = await db.queryWithGroups(`
    SELECT users.*, user_roles:roles
    FROM users
    INNER JOIN user_roles
      ON users.id = user_roles.id
  `);

  res.json(queryResult);
}));

router.post('/update-permissions', guards.isGod, asyncHandler(async (req, res) => {
  await db.query('UPDATE user_roles SET ? WHERE id = ?', [
    getParams(req.body, [
      'captain',
      'captain_game_mode',
      'god',
      'god_readonly',
      'metadata',
      'moderator',
      'news',
    ]),
    req.body.userId,
  ]);

  res.status(204).send();
}));

router.post('/update-api-object', guards.isGod, asyncHandler(async (req, res) => {
  switch (req.body.type) {
    case 'beatmapset':
      await createOrRefreshBeatmapset(req.session.accessToken, req.body.id);
    case 'user':
      await createOrRefreshUser(req.session.accessToken, req.body.id);
  }

  res.status(204).send();
}));
//#endregion

module.exports = router;
