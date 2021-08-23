const { Router } = require('express');
const db = require('../db');
const { asyncHandler } = require('../express-helpers');
const { groupBy, modeBy } = require('../helpers');

const router = Router();

router.get('/', (_, res) => {
  res.send('This is the API for <a href="https://loved.sh">loved.sh</a>. You shouldn\'t be here!');
});

// TODO: is not needed publicly anymore. check usage
router.get('/captains', asyncHandler(async (_, res) => {
  res.json(groupBy(
    await db.queryWithGroups(`
      SELECT users.*, user_roles:roles
      FROM users
      INNER JOIN user_roles
        ON users.id = user_roles.id
      WHERE user_roles.captain_game_mode IS NOT NULL
      ORDER BY users.name ASC
    `),
    'roles.captain_game_mode',
  ));
}));

router.get('/mapper-consents', asyncHandler(async (_, res) => {
  const beatmapsetConsentsByMapperId = groupBy(
    await db.queryWithGroups(`
      SELECT mapper_consent_beatmapsets.*, beatmapsets:beatmapset
      FROM mapper_consent_beatmapsets
      INNER JOIN beatmapsets
        ON mapper_consent_beatmapsets.beatmapset_id = beatmapsets.id
    `),
    'user_id',
  );
  const consents = await db.queryWithGroups(`
    SELECT mapper_consents.*, mappers:mapper
    FROM mapper_consents
    INNER JOIN users AS mappers
      ON mapper_consents.id = mappers.id
    ORDER BY \`mapper:name\` ASC
  `);

  consents.forEach((consent) => {
    consent.beatmapset_consents = beatmapsetConsentsByMapperId[consent.id] || [];
  });

  res.json(consents);
}));

router.get('/stats/polls', asyncHandler(async (_, res) => {
  res.json(await db.queryWithGroups(`
    SELECT poll_results.*, beatmapsets:beatmapset, round_game_modes.voting_threshold
    FROM poll_results
    LEFT JOIN beatmapsets
      ON poll_results.beatmapset_id = beatmapsets.id
    LEFT JOIN round_game_modes
      ON poll_results.round = round_game_modes.round_id
        AND poll_results.game_mode = round_game_modes.game_mode
    ORDER BY poll_results.ended_at DESC
  `));
}));

router.get('/submissions', asyncHandler(async (req, res) => {
  const gameMode = parseInt(req.query.gameMode, 10);

  if (isNaN(gameMode) || gameMode < 0 || gameMode > 3) {
    return res.status(422).json({ error: 'Invalid game mode' });
  }

  const beatmapsetIds = new Set();
  const userIds = new Set();

  const submissions = await db.query(`
    SELECT *
    FROM submissions
    WHERE game_mode = ?
    ORDER BY submitted_at ASC
  `, gameMode);

  for (const submission of submissions) {
    beatmapsetIds.add(submission.beatmapset_id);

    if (submission.submitter_id != null) {
      userIds.add(submission.submitter_id);
    }
  }

  const reviews = await db.query(`
    SELECT *
    FROM reviews
    WHERE game_mode = ?
    ORDER BY reviewed_at ASC
  `, gameMode);

  for (const review of reviews) {
    // This shouldn't be necessary, but is included in case there somehow ends up a mapset with a review but no submissions
    beatmapsetIds.add(review.beatmapset_id);
    userIds.add(review.captain_id);
  }

  if (beatmapsetIds.size === 0) {
    return res.json({
      beatmapsets: [],
      usersById: {},
    });
  }

  const beatmapsets = await db.query(`
    SELECT *
    FROM beatmapsets
    WHERE id IN (?)
  `, [[...beatmapsetIds]]);
  const beatmapsByBeatmapsetId = groupBy(
    await db.query(`
      SELECT beatmapset_id, bpm, game_mode, play_count
      FROM beatmaps
      WHERE beatmapset_id IN (?)
    `, [[...beatmapsetIds]]),
    'beatmapset_id',
  );
  const reviewsByBeatmapsetId = groupBy(reviews, 'beatmapset_id');
  const submissionsByBeatmapsetId = groupBy(submissions, 'beatmapset_id');

  for (const beatmapset of beatmapsets) {
    const beatmaps = groupBy(beatmapsByBeatmapsetId[beatmapset.id] || [], 'game_mode');
    const beatmapsForGameMode = beatmaps[gameMode]?.sort((a, b) => a.bpm - b.bpm) || [];

    beatmapset.reviews = reviewsByBeatmapsetId[beatmapset.id] || [];
    beatmapset.submissions = submissionsByBeatmapsetId[beatmapset.id] || [];

    beatmapset.modal_bpm = modeBy(beatmapsForGameMode, 'bpm');
    beatmapset.play_count = beatmapsForGameMode.reduce((sum, beatmap) => sum + beatmap.play_count, 0);
    beatmapset.review_score = beatmapset.reviews.length > 0
      ? beatmapset.reviews.reduce((sum, review) => sum + review.score, 0)
      : -1000; // Can't -Infinity because JSON
    beatmapset.score = beatmapset.favorite_count * 75 + beatmapset.play_count;

    beatmapset.beatmap_counts = {};
    for (const gameMode of [0, 1, 2, 3]) {
      beatmapset.beatmap_counts[gameMode] = beatmaps[gameMode]?.length ?? 0;
    }

    userIds.add(beatmapset.creator_id);
  }

  beatmapsets
    .sort((a, b) => b.score - a.score)
    .sort((a, b) => b.review_score - a.review_score);

  // Should never happen
  if (userIds.size === 0) {
    return res.json({
      beatmapsets: [],
      usersById: {},
    });
  }

  const usersById = groupBy(
    await db.query(`
      SELECT users.*, user_roles.alumni
      FROM users
      LEFT JOIN user_roles
        ON users.id = user_roles.id
      WHERE users.id IN (?)
    `, [[...userIds]]),
    'id',
    null,
    true,
  );

  res.json({
    beatmapsets,
    usersById,
  });
}));

router.get('/team', asyncHandler(async (_, res) => {
  const team = (await db.queryWithGroups(`
    SELECT users.*, user_roles:roles
    FROM users
    INNER JOIN user_roles
      ON users.id = user_roles.id
    ORDER BY users.name ASC
  `))
    .filter((user) => Object.entries(user.roles).some(([role, value]) => !role.startsWith('god') && value === true));

  const alumni = groupBy(
    team.filter((user) => user.roles.alumni),
    'roles.alumni_game_mode',
    undefined,
    false,
    'other',
  );

  const allCurrent = team.filter((user) => !user.roles.alumni);
  const current = groupBy(allCurrent, 'roles.captain_game_mode');
  delete current.null;

  for (const role of ['dev', 'metadata', 'moderator', 'news']) {
    const usersWithRole = allCurrent.filter((user) => user.roles[role]);

    if (usersWithRole.length > 0) {
      current[role] = usersWithRole;
    }
  }

  res.json({ alumni, current });
}));

module.exports = router;
