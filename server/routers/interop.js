const { Router } = require('express');
const db = require('../db');
const { asyncHandler } = require('../express-helpers');
const { groupBy } = require('../helpers');
const { Osu } = require('../osu');

const router = Router();

router.get('/data', asyncHandler(async (req, res) => {
  if (req.query.roundId == null)
    return res.status(422).json({ error: 'Missing round ID' });

  const round = await db.queryOne(`
    SELECT *
    FROM rounds
    WHERE id = ?
  `, req.query.roundId);

  if (round == null) {
    return res.status(404).send();
  }

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
    SELECT nominations.*, beatmapsets:beatmapset, description_authors:description_author
    FROM nominations
    INNER JOIN beatmapsets
      ON nominations.beatmapset_id = beatmapsets.id
    LEFT JOIN users AS description_authors
      ON nominations.description_author_id = description_authors.id
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

  const lastRoundResultsPostIds = groupBy(
    await db.query(`
      SELECT game_mode, results_post_id
      FROM round_game_modes
      WHERE round_id = ?
    `, parseInt(req.query.roundId) - 1), // TODO: naive
    'game_mode',
    'results_post_id',
    true,
  );

  res.json({
    discord_webhooks: [
      process.env.DISCORD_WEBHOOK_OSU || null,
      process.env.DISCORD_WEBHOOK_TAIKO || null,
      process.env.DISCORD_WEBHOOK_CATCH || null,
      process.env.DISCORD_WEBHOOK_MANIA || null,
    ],
    nominations,
    // TODO may break when not all game modes are present
    results_post_ids: lastRoundResultsPostIds,
    round,
  });
}));

router.get('/poll-result-recent', asyncHandler(async (_, res) => {
  const pollResult = await db.queryOne(`
    SELECT round, topic_id
    FROM poll_results
    ORDER BY ended_at DESC
    LIMIT 1
  `);

  res.json(pollResult);
}));

router.post('/poll-results', asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body))
    return res.status(422).json({ error: 'Body must be an array of poll results' });

  const resultsToInsert = [];

  for (const result of req.body) {
    resultsToInsert.push([
      result.beatmapsetId,
      new Date(result.endedAt),
      result.gameMode,
      result.no,
      result.yes,
      result.roundId,
      result.topicId,
    ]);
  }

  await db.query('INSERT INTO poll_results (beatmapset_id, ended_at, game_mode, result_no, result_yes, round, topic_id) VALUES ?', [resultsToInsert]);

  res.status(204).send();
}));

router.get('/rounds-available', asyncHandler(async (_, res) => {
  res.json(
    await db.query(`
      SELECT rounds.*, IFNULL(nomination_counts.count, 0) AS nomination_count
      FROM rounds
      LEFT JOIN (
        SELECT COUNT(*) AS count, round_id
        FROM nominations
        GROUP BY round_id
      ) AS nomination_counts
        ON rounds.id = nomination_counts.round_id
      WHERE rounds.done = 0
      ORDER BY rounds.id DESC
    `),
  );
}));

router.post('/results-post-ids', asyncHandler(async (req, res) => {
  if (req.body.roundId == null)
    return res.status(422).json({ error: 'Missing round ID' });

  if (req.body.replies == null || Object.keys(req.body.replies).length === 0)
    return res.status(422).json({ error: 'Missing reply IDs' });

  if ((await db.queryOne('SELECT 1 FROM rounds WHERE id = ?', req.body.roundId)) == null)
    return res.status(422).json({ error: 'Invalid round ID' });

  await db.transact((connection) => Promise.all(
    Object.entries(req.body.replies).map(([gameMode, postId]) => (
      connection.query(`
        UPDATE round_game_modes
        SET results_post_id = ?
        WHERE round_id = ?
          AND game_mode = ?
          AND results_post_id IS NULL
      `, [
        postId,
        req.body.roundId,
        gameMode,
      ])
    ))
  ));

  res.status(204).send();
}));

module.exports = router;
