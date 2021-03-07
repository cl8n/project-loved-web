const express = require('express');
const db = require('./db');
const guards = require('./guards');
const { createOrRefreshBeatmapset, createOrRefreshUser } = require('./osu');

function getParams(object, keys) {
  const params = {};

  for (const key of keys)
    if (object[key] !== undefined)
      params[key] = object[key];

  return params;
}

const router = express.Router();
// TODO: rethink guards

//#region public
router.post('/map-submit', async (req, res) => {

});
//#endregion

//#region interop
router.get('/local-interop', guards.hasLocalInterOpKey, async (req, res) => {
  const round = await db.queryOne(`
    SELECT *
    FROM rounds
    ORDER BY id DESC
    LIMIT 1
  `);

  const nominations = await db.query(`
    SELECT *
    FROM nominations
    WHERE round_id = ?
  `, round.id);

  res.json({
    nominations,
    round,
  });
});
//#endregion

//#region captain
router.get('/rounds', async (_, res) => {
  const rounds = await db.query('SELECT * FROM rounds');

  res.json(rounds);
});

router.get('/nominations', async (req, res) => {
  const nominations = await db.query(`
    SELECT *
    FROM nominations
    WHERE round_id = ?
  `, req.query.round_id);

  res.json(nominations);
});

router.post('/nomination-submit', async (req, res) => {
  const beatmapset = await createOrRefreshBeatmapset(req.session.accessToken, req.body.beatmapsetId);

  const queryResult = await db.query('INSERT INTO nominations SET ?', {
    beatmapset_id: beatmapset.id,
    game_mode: req.body.gameMode,
    nominator_id: res.locals.user.id,
    round_id: req.body.roundId,
  });

  res.json(await db.queryOne('SELECT * FROM nominations WHERE id = ?', queryResult.insertId));
});

router.post('/nomination-edit-description', async (req, res) => {
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
    prevDescription == null ? res.locals.user.id : prevAuthorId,
    req.body.nominationId,
  ]);

  res.status(204).send();
});

router.post('/nomination-edit-metadata', guards.isMetadataChecker, async (req, res) => {
  await db.query(`
    UPDATE nominations
    SET metadata_state = ?, overwrite_artist = ?, overwrite_title = ?
    WHERE id = ?
  `, [
    req.body.metadataState,
    req.body.artist,
    req.body.title,
    req.body.nominationId,
  ]);

  res.status(204).send();
});
//#endregion

//#region admin
router.post('/update-metadata-assignee', guards.isGod, async (req, res) => {
  await db.query(`
    UPDATE nominations
    SET metadata_assignee_id = ?
    WHERE id = ?
  `, [
    req.body.metadataAssigneeId,
    req.body.nominationId,
  ]);

  res.status(204).send();
});

router.post('/update-moderator-assignee', guards.isGod, async (req, res) => {
  await db.query(`
    UPDATE nominations
    SET moderator_assignee_id = ?
    WHERE id = ?
  `, [
    req.body.moderatorAssigneeId,
    req.body.nominationId,
  ]);

  res.status(204).send();
});

router.get('/users-with-permissions', async (_, res) => {
  const queryResult = await db.queryWithGroups(`
    SELECT users.*, ':roles', user_roles.*
    FROM users
    INNER JOIN user_roles
      ON users.id = user_roles.id
  `);

  res.json(queryResult);
});

router.post('/update-permissions', guards.isGod, async (req, res) => {
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
});

router.post('/update-api-object', guards.isGod, async (req, res) => {
  switch (req.body.type) {
    case 'beatmapset':
      await createOrRefreshBeatmapset(req.session.accessToken, req.body.id);
    case 'user':
      await createOrRefreshUser(req.session.accessToken, req.body.id);
  }

  res.status(204).send();
});
//#endregion

module.exports = router;
