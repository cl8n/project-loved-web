const { Router } = require('express');
const db = require('../db');
const { asyncHandler } = require('../express-helpers');
const { groupBy } = require('../helpers');

const router = Router();

router.get('/data', asyncHandler(async (req, res) => {
  if (req.query.roundId == null)
    return res.status(422).json({ error: 'Missing round ID' });

  const round = await db.queryOne(`
    SELECT *
    FROM rounds
    WHERE id = ?
  `, req.query.roundId);
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

  nominations.forEach((nomination) => {
    nomination.beatmaps = includesByNominationId[nomination.id]
      .map((include) => include.beatmap)
      .filter((beatmap) => beatmap != null)
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

module.exports = router;
