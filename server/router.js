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
  `);

  res.json({
    complete_rounds: rounds.filter((round) => round.done).reverse(),
    incomplete_rounds: rounds.filter((round) => !round.done),
  });
}));

router.get('/nominations', asyncHandler(async (req, res) => {
  const round = await db.queryOne(`
    SELECT *
    FROM rounds
    WHERE id = ?
  `, req.query.roundId);
  const assigneesByNominationId = groupBy(
    await db.queryWithGroups(`
      SELECT users:assignee, nomination_assignees.type AS assignee_type, nominations.id AS nomination_id
      FROM nominations
      INNER JOIN nomination_assignees
        ON nominations.id = nomination_assignees.nomination_id
      INNER JOIN users
        ON nomination_assignees.assignee_id = users.id
      WHERE nominations.round_id = ?
    `, req.query.roundId),
    'nomination_id',
  );
  const includesByNominationId = groupBy(
    await db.queryWithGroups(`
      SELECT nominations.id AS nomination_id, creators:creator, beatmaps:beatmap,
        nomination_excluded_beatmaps.beatmap_id IS NOT NULL AS 'beatmap:excluded'
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
  const nominatorsByNominationId = groupBy(
    await db.queryWithGroups(`
      SELECT users:nominator, nominations.id AS nomination_id
      FROM nominations
      INNER JOIN nomination_nominators
        ON nominations.id = nomination_nominators.nomination_id
      INNER JOIN users
        ON nomination_nominators.nominator_id = users.id
      WHERE nominations.round_id = ?
    `, req.query.roundId),
    'nomination_id',
    'nominator',
  );
  const nominations = await db.queryWithGroups(`
    SELECT nominations.*, beatmapsets:beatmapset, description_authors:description_author,
      poll_results:poll_result
    FROM nominations
    INNER JOIN beatmapsets
      ON nominations.beatmapset_id = beatmapsets.id
    LEFT JOIN users AS description_authors
      ON nominations.description_author_id = description_authors.id
    LEFT JOIN poll_results
      ON nominations.round_id = poll_results.round
        AND nominations.game_mode = poll_results.game_mode
        AND nominations.beatmapset_id = poll_results.beatmapset_id
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
    nomination.nominators = nominatorsByNominationId[nomination.id] || [];

    const assignees = assigneesByNominationId[nomination.id] || [];

    nomination.metadata_assignees = assignees
      .filter((a) => a.assignee_type === 0)
      .map((a) => a.assignee);
    nomination.moderator_assignees = assignees
      .filter((a) => a.assignee_type === 1)
      .map((a) => a.assignee);
  });

  res.json({
    nominations,
    round,
  });
}));

router.post('/nomination-submit', asyncHandler(async (req, res) => {
  // TODO: can this be done with foreign constraint instead?
  if (req.body.parentId != null) {
    const parentNomination = await db.queryOne(`
      SELECT 1
      FROM nominations
      WHERE id = ?
    `, req.body.parentId);

    if (parentNomination == null)
      return res.status(422).json({ error: 'Invalid parent nomination ID' });
  }

  const beatmapset = await res.locals.osu.createOrRefreshBeatmapset(req.body.beatmapsetId);

  if (beatmapset == null) {
    return res.status(422).json({ error: 'Invalid beatmapset ID' });
  }

  if (!beatmapset.game_modes.has(req.body.gameMode)) {
    return res.status(422).json({ error: `Beatmapset has no beatmaps in game mode ${req.body.gameMode}` });
  }

  const existingNomination = await db.queryOne(`
    SELECT 1
    FROM nominations
    WHERE round_id = ?
      AND game_mode = ?
      AND beatmapset_id = ?
  `, [
    req.body.roundId,
    req.body.gameMode,
    beatmapset.id,
  ]);

  if (existingNomination != null) {
    return res.status(422).json({ error: "Duplicate nomination. Refresh the page if you don't see it" });
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
    order: nominationCount,
    parent_id: req.body.parentId,
    round_id: req.body.roundId,
  });
  await db.query(`INSERT INTO nomination_nominators SET ?`, {
    nomination_id: queryResult.insertId,
    nominator_id: res.locals.user.id,
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
  const nomination = await db.queryOne(`
    SELECT *, NULL AS description_author
    FROM nominations
    WHERE id = ?
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
  const nominators = await db.query(`
    SELECT users.*
    FROM nomination_nominators
    INNER JOIN users
      ON nomination_nominators.nominator_id = users.id
    WHERE nomination_nominators.nomination_id = ?
  `, nomination.id);

  nomination.beatmaps = beatmaps;
  nomination.beatmapset = beatmapset;
  nomination.beatmapset_creators = creators || [];
  nomination.nominators = nominators || [];
  nomination.metadata_assignees = [];
  nomination.moderator_assignees = [];

  // TODO: log me!

  res.json(nomination);
}));

router.post('/nomination-edit-description', asyncHandler(async (req, res) => {
  const existingNomination = await db.queryOne(`
    SELECT description, description_author_id, description_state, game_mode
    FROM nominations
    WHERE id = ?
  `, req.body.nominationId);

  if (existingNomination == null)
    return res.status(422).json({ error: 'Invalid nomination ID' });

  const {
    description: prevDescription,
    description_author_id: prevAuthorId,
    description_state: prevState,
    game_mode: gameMode,
  } = existingNomination;
  const roles = guards.roles(req, res);

  if (!(prevState !== 1 && roles.gameModes[gameMode]) && !(prevDescription != null && roles.news))
    return res.status(403).send();

  if (!roles.gameModes[gameMode] && req.body.description == null)
    return res.status(403).json({ error: "Can't remove description as editor" });

  await db.query(`
    UPDATE nominations
    SET description = ?, description_author_id = ?, description_state = ?
    WHERE id = ?
  `, [
    req.body.description,
    req.body.description == null ? null : prevDescription == null ? res.locals.user.id : prevAuthorId,
    (roles.news && prevDescription != null && req.body.description != null) ? 1 : 0,
    req.body.nominationId,
  ]);

  const nomination = await db.queryOneWithGroups(`
    SELECT nominations.*, description_authors:description_author
    FROM nominations
    LEFT JOIN users AS description_authors
      ON nominations.description_author_id = description_authors.id
    WHERE nominations.id = ?
  `, req.body.nominationId);

  res.json(nomination);
}));

router.post('/nomination-edit-metadata', asyncHandler(async (req, res) => {
  const roles = guards.roles(req, res);

  if (!roles.metadata && !roles.news)
    return res.status(403).json({ error: 'Must be a metadata checker or news author' });

  const creators = [];

  if (req.body.creators != null && req.body.creators.length > 0) {
    for (const creatorName of req.body.creators) {
      const creator = await res.locals.osu.createOrRefreshUser(creatorName, true);

      if (creator == null)
        return res.status(422).json({ error: `Invalid creator username: ${creatorName}` });

      creators.push(creator);
    }
  }

  const nomination = await db.queryOne(`
    SELECT beatmapset_id, game_mode, metadata_state
    FROM nominations
    WHERE id = ?
  `, req.body.nominationId);

  if (roles.metadata) {
    let artist = req.body.artist;
    let title = req.body.title;

    if (req.body.state === 2) {
      artist = null;
      title = null;

      if (nomination.metadata_state === 1)
        await res.locals.osu.createOrRefreshBeatmapset(nomination.beatmapset_id, true);
    }

    await db.query(`
      UPDATE nominations
      SET metadata_state = ?, overwrite_artist = ?, overwrite_title = ?
      WHERE id = ?
    `, [
      req.body.state,
      artist,
      title,
      req.body.nominationId,
    ]);
  }

  Object.assign(nomination, await db.queryOneWithGroups(`
    SELECT nominations.*, beatmapsets:beatmapset
    FROM nominations
    INNER JOIN beatmapsets
      ON nominations.beatmapset_id = beatmapsets.id
    WHERE nominations.id = ?
  `, req.body.nominationId));

  await db.query('DELETE FROM beatmapset_creators WHERE beatmapset_id = ? AND game_mode = ?', [
    nomination.beatmapset_id,
    nomination.game_mode,
  ]);

  if (creators.length > 0)
    await db.query('INSERT INTO beatmapset_creators VALUES ?', [
      creators.map((user) => [nomination.beatmapset_id, user.id, nomination.game_mode]),
    ]);

  nomination.beatmapset_creators = creators;

  res.json(nomination);
}));

router.post('/nomination-edit-moderation', guards.isModerator, asyncHandler(async (req, res) => {
  await db.query('UPDATE nominations SET moderator_state = ? WHERE id = ?', [
    req.body.state,
    req.body.nominationId,
  ]);

  res.json({
    id: req.body.nominationId,
    moderator_state: req.body.state,
  });
}));

router.delete('/nomination', asyncHandler(async (req, res) => {
  await db.query('DELETE FROM nomination_assignees WHERE nomination_id = ?', req.query.nominationId);
  await db.query('DELETE FROM nomination_excluded_beatmaps WHERE nomination_id = ?', req.query.nominationId);
  await db.query('DELETE FROM nomination_nominators WHERE nomination_id = ?', req.query.nominationId);
  await db.query('DELETE FROM nominations WHERE id = ?', req.query.nominationId);

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

router.post('/update-nominators', guards.isCaptain, asyncHandler(async (req, res) => {
  await db.query('DELETE FROM nomination_nominators WHERE nomination_id = ?', req.body.nominationId);

  if (req.body.nominatorIds != null && req.body.nominatorIds.length > 0)
    await db.query('INSERT INTO nomination_nominators VALUES ?', [
      req.body.nominatorIds.map((id) => [req.body.nominationId, id]),
    ]);

  const nominators = await db.query(`
    SELECT users.*
    FROM nomination_nominators
    INNER JOIN users
      ON nomination_nominators.nominator_id = users.id
    WHERE nomination_nominators.nomination_id = ?
  `, req.body.nominationId);

  res.json({
    id: req.body.nominationId,
    nominators: nominators || [],
  });
}));

router.post('/lock-nominations', asyncHandler(async (req, res) => {
  const roles = guards.roles(req, res);

  if (!roles.news && !roles.gameModes[req.body.gameMode])
    return res.status(403).json({ error: 'Must be a news author or captain for this game mode' });

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
  const user = await res.locals.osu.createOrRefreshUser(req.body.name, true);

  if (user == null)
    return res.status(422).json({ error: 'Invalid username' });

  await db.query('INSERT IGNORE INTO user_roles SET id = ?', user.id);

  user.roles = await db.queryOne(`
    SELECT *
    FROM user_roles
    WHERE id = ?
  `, user.id);
  delete user.roles.id;

  res.json(user);
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

router.post('/update-excluded-beatmaps', guards.isCaptain, asyncHandler(async (req, res) => {
  await db.query('DELETE FROM nomination_excluded_beatmaps WHERE nomination_id = ?', req.body.nominationId);

  if (req.body.excludedBeatmapIds != null && req.body.excludedBeatmapIds.length > 0)
    await db.query('INSERT INTO nomination_excluded_beatmaps VALUES ?', [req.body.excludedBeatmapIds.map((id) => [id, req.body.nominationId])]);

  res.status(204).send();
}));

router.post('/update-nomination-assignees', asyncHandler(async (req, res) => {
  const types = {
    0: 'metadata',
    1: 'moderator',
  };

  const roles = guards.roles(req, res);
  const typeString = types[req.body.type];

  if (typeString == null)
    return res.status(422).json({ error: 'Invalid assignee type' });

  if (!roles.news && !roles[typeString])
    return res.status(403).json({ error: `Must have ${typeString} or news role` });

  await db.query(`
    DELETE FROM nomination_assignees
    WHERE nomination_id = ?
      AND type = ?
  `, [req.body.nominationId, req.body.type]);

  if (req.body.assigneeIds != null && req.body.assigneeIds.length > 0)
    await db.query('INSERT INTO nomination_assignees (assignee_id, nomination_id, type) VALUES ?', [
      req.body.assigneeIds.map((id) => [id, req.body.nominationId, req.body.type]),
    ]);

  const assignees = await db.query(`
    SELECT users.*
    FROM nomination_assignees
    INNER JOIN users
      ON nomination_assignees.assignee_id = users.id
    WHERE nomination_assignees.nomination_id = ?
      AND nomination_assignees.type = ?
  `, [req.body.nominationId, req.body.type]);

  res.json({
    id: req.body.nominationId,
    [`${typeString}_assignees`]: assignees || [],
  });
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
      'alumni',
      'alumni_game_mode',
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
      apiObject = await res.locals.osu.createOrRefreshBeatmapset(req.body.id, true);
      break;
    case 'user':
      apiObject = await res.locals.osu.createOrRefreshUser(req.body.id, false, true);
      break;
  }

  if (apiObject == null) {
    return res.status(422).json({ error: 'Invalid ID' });
  }

  res.status(204).send();
}));

router.post('/update-api-object-bulk', guards.isGod, (req, res) => {
  let apiObject;
  const type = req.body.type;

  (async () => {
    for (const id of req.body.ids) {
      switch (type) {
        case 'beatmapset':
          apiObject = await res.locals.osu.createOrRefreshBeatmapset(id, true);
          break;
        case 'user':
          apiObject = await res.locals.osu.createOrRefreshUser(id, false, true);
          break;
      }

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
