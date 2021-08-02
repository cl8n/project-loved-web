const { Router } = require('express');
const db = require('../db');
const { asyncHandler } = require('../express-helpers');
const { groupBy } = require('../helpers');

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
  let consents = await db.queryWithGroups(`
    SELECT mapper_consents.*, mappers:mapper, mapper_consent_beatmapsets:beatmapset_consent, beatmapsets:beatmapset_consent_beatmapset
    FROM mapper_consents
    INNER JOIN users AS mappers
      ON mapper_consents.id = mappers.id
    LEFT JOIN mapper_consent_beatmapsets
      ON mapper_consent_beatmapsets.user_id = mapper_consents.id
    LEFT JOIN beatmapsets
      ON mapper_consent_beatmapsets.beatmapset_id = beatmapsets.id
    ORDER BY \`mapper:name\` ASC
  `);

  let mappedConsents = {};

  function beatmapsetConsentFromConsent(consent) {
    let beatmapset_consent = consent.beatmapset_consent;
    beatmapset_consent.beatmapset = consent.beatmapset_consent_beatmapset;
    delete beatmapset_consent.beatmapset_id;
    return beatmapset_consent;
  }

  consents.forEach((consent) => {
    if (consent.id in mappedConsents) {
      mappedConsents[consent.id].beatmapset_consents.push(beatmapsetConsentFromConsent(consent));
    } else {
      consent.beatmapset_consents = consent.beatmapset_consent == null ? [] : [beatmapsetConsentFromConsent(consent)];
      delete consent.beatmapset_consent;
      mappedConsents[consent.id] = consent;
    }
    delete consent.beatmapset_consent_beatmapset;
  })

  consents = Object.values(mappedConsents);
  consents.sort((c1, c2) => c1.mapper.name.localeCompare(c2.mapper.name));
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
