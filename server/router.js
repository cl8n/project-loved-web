const express = require('express');
const db = require('./db');
const { asyncHandler } = require('./express-helpers');
const guards = require('./guards');
const { groupBy } = require('./helpers');

function getParams(object, keys) {
  const params = {};

  for (const key of keys)
    if (object[key] !== undefined)
      params[key] = object[key];

  return params;
}

const router = express.Router();
// TODO: rethink guards

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
      LEFT JOIN beatmaps
        ON nominations.beatmapset_id = beatmaps.beatmapset_id
          AND nominations.game_mode = beatmaps.game_mode
      LEFT JOIN nomination_excluded_beatmaps
        ON nominations.id = nomination_excluded_beatmaps.nomination_id
          AND beatmaps.id = nomination_excluded_beatmaps.beatmap_id
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
    ORDER BY nominations.order ASC, nominations.id ASC
  `, req.query.roundId);

  round.game_modes = groupBy(
    await db.query(`
      SELECT *
      FROM round_game_modes
      WHERE round_id = ?
    `, req.query.roundId),
    'game_mode',
    null,
    true,
  );

  // TODO: Should not be necessary to check for uniques like this. Just fix query.
  //       See interop query as well
  nominations.forEach((nomination) => {
    nomination.beatmaps = includesByNominationId[nomination.id]
      .map((include) => include.beatmap)
      .filter((b1, i, all) => b1 != null && all.findIndex((b2) => b1.id === b2.id) === i)
      .sort((a, b) => a.star_rating - b.star_rating)
      .sort((a, b) => a.key_count - b.key_count);
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

  const beatmapset = await res.locals.osu.createOrRefreshBeatmapset(req.body.beatmapsetId, req.body.gameMode);

  if (beatmapset == null) {
    return res.status(422).json({ error: 'Invalid beatmapset ID' });
  }

  if (!beatmapset.game_modes.has(req.body.gameMode)) {
    return res.status(422).json({ error: `Beatmapset has no beatmaps in game mode ${req.body.gameMode}` });
  }

  const nominationCount = (await db.queryOne(`
    SELECT COUNT(*) AS count
    FROM nominations
    WHERE round_id = ?
      AND game_mode = ?
  `, [req.body.roundId, req.body.gameMode])).count;
  const queryResult = await db.query('INSERT INTO nominations SET ?', {
    beatmapset_id: beatmapset.id,
    game_mode: req.body.gameMode,
    nominator_id: res.locals.user.id,
    order: nominationCount,
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
    SELECT *, FALSE AS excluded
    FROM beatmaps
    WHERE beatmapset_id = ?
      AND game_mode = ?
    ORDER BY key_count ASC, star_rating ASC
  `, [
    nomination.beatmapset_id,
    req.body.gameMode,
  ]);

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
    LEFT JOIN users AS description_authors
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

router.post('/update-nomination-order', guards.isCaptain, asyncHandler(async (req, res) => {
  await Promise.all(Object.entries(req.body).map(([nominationId, order]) => (
    db.query(`
      UPDATE nominations
      SET \`order\` = ?
      WHERE id = ?
    `, [order, nominationId])
  )));

  res.status(204).send();
}));

router.post('/lock-nominations', guards.isCaptain, asyncHandler(async (req, res) => {
  await db.query('UPDATE round_game_modes SET nominations_locked = ? WHERE round_id = ? AND game_mode = ?', [
    req.body.lock,
    req.body.roundId,
    req.body.gameMode,
  ]);

  res.status(204).send();
}));
//#endregion

//#region admin
router.post('/add-user', guards.isGod, asyncHandler(async (req, res) => {
  const user = await res.locals.osu.createOrRefreshUser(req.body.name);

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

router.post('/add-round', guards.isNewsAuthor, asyncHandler(async (req, res) => {
  const queryResult = await db.query("INSERT INTO rounds SET name = 'Unnamed round'");

  for (const gameMode of [0, 1, 2, 3]) {
    await db.query('INSERT INTO round_game_modes SET ?', [{
      game_mode: gameMode,
      round_id: queryResult.insertId,
      voting_threshold: gameMode === 0 ? 0.85 : 0.8,
    }]);
  }

  res.json({ id: queryResult.insertId });
}));

router.post('/update-round', guards.isNewsAuthor, asyncHandler(async (req, res) => {
  await db.query('UPDATE rounds SET ? WHERE id = ?', [
    getParams(req.body.round, [
      'name',
      'news_intro',
      'news_intro_preview',
      'news_outro',
      'news_posted_at',
    ]),
    req.body.roundId,
  ]);

  res.status(204).send();
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

router.post('/update-creators', guards.isMetadataChecker, asyncHandler(async (req, res) => {
  await db.query('DELETE FROM beatmapset_creators WHERE beatmapset_id = ? AND game_mode = ?', [req.body.beatmapsetId, req.body.gameMode]);

  if (req.body.creatorIds != null && req.body.creatorIds.length > 0)
    await db.query('INSERT INTO beatmapset_creators VALUES ?', [req.body.creatorIds.map((id) => [req.body.beatmapsetId, id, req.body.gameMode])]);

  const creators = await db.query(`
    SELECT users.*
    FROM beatmapset_creators
    INNER JOIN users
      ON beatmapset_creators.creator_id = users.id
    WHERE beatmapset_creators.beatmapset_id = ?
      AND beatmapset_creators.game_mode = ?
  `, [
    req.body.beatmapsetId,
    req.body.gameMode,
  ]);

  res.json(creators);
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
  let apiObject;

  switch (req.body.type) {
    case 'beatmapset':
      apiObject = await res.locals.osu.createOrRefreshBeatmapset(req.body.id);
      break;
    case 'user':
      apiObject = await res.locals.osu.createOrRefreshUser(req.body.id);
      break;
  }

  if (apiObject == null) {
    return res.status(422).json({ error: 'Invalid ID' });
  }

  res.status(204).send();
}));

router.post('/update-api-object-bulk', guards.isGod, (req, res) => {
  let fn;

  switch (req.body.type) {
    case 'beatmapset':
      fn = res.locals.osu.createOrRefreshBeatmapset;
      break;
    case 'user':
      fn = res.locals.osu.createOrRefreshUser;
      break;
  }

  fn = fn.bind(res.locals.osu);

  (async () => {
    let apiObject;

    for (const id of req.body.ids) {
      apiObject = await fn(id);

      if (apiObject == null)
        console.log(`Could not update ${id} from bulk request`);
      else
        console.log(`Updated object ${id} from bulk request`);

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  })();

  res.status(204).send();
});
//#endregion

module.exports = router;
