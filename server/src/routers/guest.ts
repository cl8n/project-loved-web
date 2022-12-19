import { createHash } from 'crypto';
import { Router } from 'express';
import { GameMode, gameModes } from 'loved-bridge/beatmaps/gameMode';
import { reviewRating } from 'loved-bridge/beatmaps/reviewRating';
import type {
  Beatmap,
  Beatmapset,
  Consent,
  ConsentBeatmapset,
  Nomination,
  NominationAssignee,
  NominationDescriptionEdit,
  Poll,
  Review,
  Round,
  RoundGameMode,
  Submission,
  User,
  UserRole,
} from 'loved-bridge/tables';
import { AssigneeType, ConsentValue, Role } from 'loved-bridge/tables';
import qs from 'querystring';
import config from '../config.js';
import db from '../db.js';
import { asyncHandler } from '../express-helpers.js';
import { currentUserRoles } from '../guards.js';
import { groupBy, modeBy, sortCreators } from '../helpers.js';
import { accessSetting } from '../settings.js';
import { isGameMode } from '../type-guards.js';

const guestRouter = Router();
export default guestRouter;

guestRouter.get('/', (_, res) => {
  res.send('This is the API for <a href="https://loved.sh">loved.sh</a>. You shouldn\'t be here!');
});

guestRouter.get(
  '/current-news-post',
  asyncHandler(async (_, res) => {
    const ongoingPoll = await db.queryOne<Pick<Poll, 'round_id'>>(`
      SELECT round_id
      FROM polls
      WHERE ended_at > NOW()
      ORDER BY id DESC
      LIMIT 1
    `);

    if (ongoingPoll == null) {
      return res.status(404).send();
    }

    const round = await db.queryOne<Pick<Round, 'name' | 'news_posted_at'>>(
      `
        SELECT name, news_posted_at
        FROM rounds
        WHERE id = ?
      `,
      [ongoingPoll.round_id],
    );

    if (round?.news_posted_at == null) {
      return res.status(404).send();
    }

    const slugDate = round.news_posted_at.toISOString().slice(0, 10);
    const slugName = round.name.toLowerCase().replace(/\W+/g, '-');

    res.json({
      roundName: round.name,
      url: `https://osu.ppy.sh/home/news/${slugDate}-project-loved-${slugName}`,
    });
  }),
);

guestRouter.get(
  '/mapper-consents',
  asyncHandler(async (_, res) => {
    const beatmapsetConsentsByMapperId = groupBy<
      ConsentBeatmapset['user_id'],
      ConsentBeatmapset & { beatmapset: Beatmapset }
    >(
      await db.queryWithGroups<ConsentBeatmapset & { beatmapset: Beatmapset }>(`
        SELECT mapper_consent_beatmapsets.*, beatmapsets:beatmapset
        FROM mapper_consent_beatmapsets
        INNER JOIN beatmapsets
          ON mapper_consent_beatmapsets.beatmapset_id = beatmapsets.id
      `),
      'user_id',
    );
    const consents: (Consent & {
      beatmapset_consents?: (ConsentBeatmapset & { beatmapset: Beatmapset })[];
      mapper: User;
    })[] = await db.queryWithGroups<Consent & { mapper: User }>(`
      SELECT mapper_consents.*, mappers:mapper
      FROM mapper_consents
      INNER JOIN users AS mappers
        ON mapper_consents.user_id = mappers.id
      ORDER BY \`mapper:name\` ASC
    `);

    consents.forEach((consent) => {
      consent.beatmapset_consents = beatmapsetConsentsByMapperId[consent.user_id] || [];
    });

    res.json(consents);
  }),
);

guestRouter.get(
  '/nominations',
  asyncHandler(async (req, res) => {
    const round:
      | (Round & {
          game_modes?: Record<GameMode, RoundGameMode>;
          hide_nomination_status?: Record<GameMode, boolean | null | undefined>;
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
      [req.query.roundId],
    );

    if (round == null) {
      return res.status(404).send();
    }

    const assigneesByNominationId = groupBy<
      Nomination['id'],
      {
        assignee: User;
        assignee_type: NominationAssignee['type'];
        nomination_id: Nomination['id'];
      }
    >(
      await db.queryWithGroups<{
        assignee: User;
        assignee_type: NominationAssignee['type'];
        nomination_id: Nomination['id'];
      }>(
        `
          SELECT users:assignee, nomination_assignees.type AS assignee_type, nominations.id AS nomination_id
          FROM nominations
          INNER JOIN nomination_assignees
            ON nominations.id = nomination_assignees.nomination_id
          INNER JOIN users
            ON nomination_assignees.assignee_id = users.id
          WHERE nominations.round_id = ?
        `,
        [req.query.roundId],
      ),
      'nomination_id',
    );
    const beatmapsByNominationId = groupBy<Nomination['id'], Beatmap & { excluded: boolean }>(
      await db.queryWithGroups<{
        beatmap: Beatmap & { excluded: boolean };
        nomination_id: Nomination['id'];
      }>(
        `
          SELECT nominations.id AS nomination_id, beatmaps:beatmap,
            nomination_excluded_beatmaps.beatmap_id IS NOT NULL AS 'beatmap:excluded'
          FROM nominations
          INNER JOIN beatmaps
            ON nominations.beatmapset_id = beatmaps.beatmapset_id
          LEFT JOIN nomination_excluded_beatmaps
            ON nominations.id = nomination_excluded_beatmaps.nomination_id
              AND beatmaps.id = nomination_excluded_beatmaps.beatmap_id
          WHERE beatmaps.deleted_at IS NULL
            AND nominations.round_id = ?
        `,
        [req.query.roundId],
      ),
      'nomination_id',
      'beatmap',
    );
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
        [req.query.roundId],
      ),
      'nomination_id',
      'creator',
    );
    const descriptionEditsByNominationId = groupBy<
      Nomination['id'],
      NominationDescriptionEdit & { editor: User }
    >(
      await db.queryWithGroups<NominationDescriptionEdit & { editor: User }>(
        `
          SELECT nomination_description_edits.*, editors:editor
          FROM nominations
          INNER JOIN nomination_description_edits
            ON nominations.id = nomination_description_edits.nomination_id
          INNER JOIN users AS editors
            ON nomination_description_edits.editor_id = editors.id
          WHERE nominations.round_id = ?
          ORDER BY nomination_description_edits.edited_at ASC
        `,
        [req.query.roundId],
      ),
      'nomination_id',
    );
    const nominatorsByNominationId = groupBy<Nomination['id'], User>(
      await db.queryWithGroups<{ nomination_id: Nomination['id']; nominator: User }>(
        `
          SELECT users:nominator, nominations.id AS nomination_id
          FROM nominations
          INNER JOIN nomination_nominators
            ON nominations.id = nomination_nominators.nomination_id
          INNER JOIN users
            ON nomination_nominators.nominator_id = users.id
          WHERE nominations.round_id = ?
        `,
        [req.query.roundId],
      ),
      'nomination_id',
      'nominator',
    );
    let nominations: (Nomination & {
      beatmaps?: (Beatmap & { excluded: boolean })[];
      beatmapset: Beatmapset;
      beatmapset_creators?: User[];
      description_author: User | null;
      description_edits?: (NominationDescriptionEdit & { editor: User })[];
      metadata_assignees?: User[];
      moderator_assignees?: User[];
      nominators?: User[];
      poll: Poll | null;
    })[] = await db.queryWithGroups<
      Nomination & {
        beatmapset: Beatmapset;
        description_author: User | null;
        poll: Poll | null;
      }
    >(
      `
        SELECT nominations.*, beatmapsets:beatmapset, description_authors:description_author,
          polls:poll
        FROM nominations
        INNER JOIN beatmapsets
          ON nominations.beatmapset_id = beatmapsets.id
        LEFT JOIN users AS description_authors
          ON nominations.description_author_id = description_authors.id
        LEFT JOIN polls
          ON nominations.round_id = polls.round_id
            AND nominations.game_mode = polls.game_mode
            AND nominations.beatmapset_id = polls.beatmapset_id
        WHERE nominations.round_id = ?
        ORDER BY nominations.order ASC, nominations.id ASC
      `,
      [req.query.roundId],
    );

    const hasRole = currentUserRoles(req, res);

    if (!hasRole('any')) {
      const poll = await db.queryOne('SELECT 1 FROM polls WHERE round_id = ?', [req.query.roundId]);

      if (poll == null) {
        round.hide_nomination_status = accessSetting('hideNominationStatus');
        nominations = nominations.filter(
          (nomination) => !round.hide_nomination_status?.[nomination.game_mode],
        );
      }
    }

    round.game_modes = groupBy<RoundGameMode['game_mode'], RoundGameMode>(
      await db.query<RoundGameMode>(
        `
          SELECT *
          FROM round_game_modes
          WHERE round_id = ?
        `,
        [req.query.roundId],
      ),
      'game_mode',
      null,
      true,
    );

    nominations.forEach((nomination) => {
      nomination.beatmaps = (beatmapsByNominationId[nomination.id] || [])
        .sort((a, b) => a.star_rating - b.star_rating)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .sort((a, b) => a.key_count! - b.key_count!);
      nomination.beatmapset_creators = sortCreators(
        beatmapsetCreatorsByNominationId[nomination.id] || [],
        nomination.beatmapset.creator_id,
      );
      nomination.description_edits = descriptionEditsByNominationId[nomination.id] || [];
      nomination.nominators = nominatorsByNominationId[nomination.id] || [];

      const assignees = assigneesByNominationId[nomination.id] || [];

      nomination.metadata_assignees = assignees
        .filter((a) => a.assignee_type === AssigneeType.metadata)
        .map((a) => a.assignee);
      nomination.moderator_assignees = assignees
        .filter((a) => a.assignee_type === AssigneeType.moderator)
        .map((a) => a.assignee);
    });

    res.json({
      nominations,
      round,
    });
  }),
);

guestRouter.get(
  '/rounds',
  asyncHandler(async (_, res) => {
    const rounds = await db.query<Round & { nomination_count: number }>(`
      SELECT rounds.*, IFNULL(nomination_counts.count, 0) AS nomination_count
      FROM rounds
      LEFT JOIN (
        SELECT COUNT(*) AS count, round_id
        FROM nominations
        GROUP BY round_id
      ) AS nomination_counts
        ON rounds.id = nomination_counts.round_id
      ORDER BY rounds.id ASC
    `);

    res.json({
      complete_rounds: rounds.filter((round) => round.done).reverse(),
      incomplete_rounds: rounds.filter((round) => !round.done),
    });
  }),
);

guestRouter.get(
  '/stats/polls',
  asyncHandler(async (_, res) => {
    res.json(
      await db.queryWithGroups<
        Poll & {
          beatmapset: Beatmapset | null;
          voting_threshold: RoundGameMode['voting_threshold'] | null;
        }
      >(`
        SELECT polls.*, beatmapsets:beatmapset, round_game_modes.voting_threshold
        FROM polls
        LEFT JOIN beatmapsets
          ON polls.beatmapset_id = beatmapsets.id
        LEFT JOIN round_game_modes
          ON polls.round_id = round_game_modes.round_id
            AND polls.game_mode = round_game_modes.game_mode
        ORDER BY polls.ended_at DESC
      `),
    );
  }),
);

guestRouter.get(
  '/submissions',
  asyncHandler(async (req, res) => {
    const gameMode = parseInt(req.query.gameMode ?? '', 10);

    if (!isGameMode(gameMode)) {
      return res.status(422).json({ error: 'Invalid game mode' });
    }

    const beatmapsetIds = new Set<number>();
    const userIds = new Set<number>();

    const hasRole = currentUserRoles(req, res);
    const canViewNominationStatus =
      !accessSetting(`hideNominationStatus.${gameMode}`) || hasRole('any');

    const submissions = await db.query<Submission>(
      `
        SELECT *
        FROM submissions
        WHERE game_mode = ?
        ORDER BY submitted_at ASC
      `,
      [gameMode],
    );

    for (const submission of submissions) {
      beatmapsetIds.add(submission.beatmapset_id);

      if (submission.submitter_id != null) {
        userIds.add(submission.submitter_id);
      }
    }

    const reviews = await db.query<Review & { active_captain: boolean | null }>(
      `
        SELECT reviews.*, NOT user_roles.alumni AS active_captain
        FROM reviews
        LEFT JOIN user_roles
          ON user_roles.game_mode = ?
          AND user_roles.role_id = ?
          AND reviews.reviewer_id = user_roles.user_id
        WHERE reviews.game_mode = ?
        ORDER BY (score < -3) DESC, active_captain DESC, reviews.reviewed_at ASC
      `,
      [gameMode, Role.captain, gameMode],
    );

    for (const review of reviews) {
      beatmapsetIds.add(review.beatmapset_id);
      userIds.add(review.reviewer_id);

      // TODO: Type cast this correctly earlier?
      if (review.active_captain != null) {
        review.active_captain = (review.active_captain as unknown) !== 0;
      }
    }

    if (beatmapsetIds.size === 0) {
      return res.json({
        beatmapsets: [],
        usersById: {},
      });
    }

    const beatmapsets: (Beatmapset &
      Partial<{
        beatmap_counts: Record<GameMode, number>;
        consent: boolean | null;
        key_modes: number[];
        low_favorites: boolean;
        maximum_length: number;
        modal_bpm: number;
        nominated_round_name: string | null;
        poll: Partial<Pick<Poll, 'beatmapset_id'>> &
          Pick<Poll, 'topic_id'> & { in_progress: 0 | 1 | boolean; passed: 0 | 1 | boolean };
        review_score: number;
        review_score_all: number;
        reviews: (Review & { active_captain: boolean | null })[];
        score: number;
        strictly_rejected: boolean;
        submissions: Submission[];
      }>)[] = await db.query<Beatmapset>(
      `
        SELECT *
        FROM beatmapsets
        WHERE id IN (?)
      `,
      [[...beatmapsetIds]],
    );
    const beatmapsByBeatmapsetId = groupBy<
      Beatmap['beatmapset_id'],
      Pick<
        Beatmap,
        'beatmapset_id' | 'bpm' | 'game_mode' | 'key_count' | 'play_count' | 'total_length'
      >
    >(
      await db.query<
        Pick<
          Beatmap,
          'beatmapset_id' | 'bpm' | 'game_mode' | 'key_count' | 'play_count' | 'total_length'
        >
      >(
        `
          SELECT beatmapset_id, bpm, game_mode, key_count, play_count, total_length
          FROM beatmaps
          WHERE beatmapset_id IN (?)
            AND deleted_at IS NULL
        `,
        [[...beatmapsetIds]],
      ),
      'beatmapset_id',
    );
    const futureNominationsByBeatmapsetId =
      canViewNominationStatus &&
      groupBy<Nomination['beatmapset_id'], Round['name']>(
        await db.query<Pick<Nomination, 'beatmapset_id'> & Pick<Round, 'name'>>(
          `
            SELECT nominations.beatmapset_id, rounds.name
            FROM nominations
            INNER JOIN rounds
              ON nominations.round_id = rounds.id
            WHERE nominations.beatmapset_id IN (?)
              AND nominations.game_mode = ?
              AND rounds.done = 0
            ORDER BY rounds.id DESC
          `,
          [[...beatmapsetIds], gameMode],
        ),
        'beatmapset_id',
        'name',
      );
    // TODO: Scope to complete polls when incomplete polls are stored in `polls`
    const pollByBeatmapsetId = groupBy<
      Poll['beatmapset_id'],
      Pick<Poll, 'beatmapset_id' | 'topic_id'> & { in_progress: 0 | 1; passed: 0 | 1 }
    >(
      await db.query<
        Pick<Poll, 'beatmapset_id' | 'topic_id'> & { in_progress: 0 | 1; passed: 0 | 1 }
      >(
        `
          SELECT polls.beatmapset_id, polls.topic_id,
            polls.result_no IS NULL OR polls.result_yes IS NULL AS in_progress,
            polls.result_no IS NOT NULL AND polls.result_yes IS NOT NULL AND
              polls.result_yes / (polls.result_no + polls.result_yes) >= round_game_modes.voting_threshold AS passed
          FROM polls
          INNER JOIN round_game_modes
            ON polls.round_id = round_game_modes.round_id
              AND polls.game_mode = round_game_modes.game_mode
          WHERE polls.id IN (
            SELECT MAX(id)
            FROM polls
            WHERE game_mode = ?
            GROUP BY beatmapset_id
          )
            AND polls.beatmapset_id IN (?)
        `,
        [gameMode, [...beatmapsetIds]],
      ),
      'beatmapset_id',
      null,
      true,
    );
    const reviewsByBeatmapsetId = groupBy<
      Review['beatmapset_id'],
      Review & { active_captain: boolean | null }
    >(reviews, 'beatmapset_id');
    const submissionsByBeatmapsetId = groupBy<Submission['beatmapset_id'], Submission>(
      submissions,
      'beatmapset_id',
    );

    const beatmapsetConsentByBeatmapsetUserKey = groupBy<
      `${number}-${number}`,
      ConsentBeatmapset['consent'] | undefined
    >(
      await db.query<
        Pick<ConsentBeatmapset, 'consent'> & { beatmapset_user: `${number}-${number}` }
      >(
        `
          SELECT consent, CONCAT(beatmapset_id, '-', user_id) as beatmapset_user
          FROM mapper_consent_beatmapsets
          WHERE beatmapset_id IN (?)
        `,
        [[...beatmapsetIds]],
      ),
      'beatmapset_user',
      'consent',
      true,
    );
    const consentByUserId = groupBy<Consent['user_id'], Consent['consent']>(
      await db.query<Pick<Consent, 'consent' | 'user_id'>>(
        `
          SELECT consent, user_id
          FROM mapper_consents
          WHERE user_id IN (
            SELECT creator_id
            FROM beatmapsets
            WHERE id IN (?)
          )
        `,
        [[...beatmapsetIds]],
      ),
      'user_id',
      'consent',
      true,
    );

    for (const beatmapset of beatmapsets) {
      const beatmaps = groupBy<
        Beatmap['game_mode'],
        Pick<
          Beatmap,
          'beatmapset_id' | 'bpm' | 'game_mode' | 'key_count' | 'play_count' | 'total_length'
        >
      >(beatmapsByBeatmapsetId[beatmapset.id] || [], 'game_mode');
      const beatmapsForGameMode = beatmaps[gameMode]?.sort((a, b) => a.bpm - b.bpm) || [];
      const consent: ConsentValue | boolean | null =
        beatmapsetConsentByBeatmapsetUserKey[`${beatmapset.id}-${beatmapset.creator_id}`] ??
        consentByUserId[beatmapset.creator_id];

      beatmapset.reviews = reviewsByBeatmapsetId[beatmapset.id] || [];
      beatmapset.submissions = submissionsByBeatmapsetId[beatmapset.id] || [];

      beatmapset.consent =
        consent == null || consent === ConsentValue.unreachable ? null : !!consent;
      beatmapset.key_modes = (
        [...new Set(beatmapsForGameMode.map((b) => b.key_count))].filter(
          (k) => k != null,
        ) as number[]
      ).sort((a, b) => a - b);
      beatmapset.low_favorites = gameMode === GameMode.osu && beatmapset.favorite_count < 30;
      beatmapset.maximum_length = Math.max(
        ...beatmapsForGameMode.map((beatmap) => beatmap.total_length),
        0,
      );
      beatmapset.modal_bpm = modeBy(beatmapsForGameMode, 'bpm');
      beatmapset.nominated_round_name = canViewNominationStatus
        ? (futureNominationsByBeatmapsetId as Record<number, string[] | undefined>)[
            beatmapset.id
          ]?.[0] ?? null
        : null;
      beatmapset.play_count = beatmapsForGameMode.reduce(
        (sum, beatmap) => sum + beatmap.play_count,
        0,
      );
      beatmapset.poll = pollByBeatmapsetId[beatmapset.id];
      beatmapset.review_score = reviewRating(beatmapset.reviews);
      beatmapset.review_score_all = reviewRating(beatmapset.reviews, true);
      beatmapset.score = beatmapset.favorite_count * 75 + beatmapset.play_count;
      beatmapset.strictly_rejected = beatmapset.reviews.some((review) => review.score < -3);

      if (beatmapset.poll != null) {
        delete beatmapset.poll.beatmapset_id;
        beatmapset.poll.in_progress = beatmapset.poll.in_progress > 0;
        beatmapset.poll.passed = beatmapset.poll.passed > 0;
      }

      beatmapset.beatmap_counts = {} as Record<GameMode, number>;
      for (const gameMode of gameModes) {
        beatmapset.beatmap_counts[gameMode] = beatmaps[gameMode]?.length ?? 0;
      }

      userIds.add(beatmapset.creator_id);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    beatmapsets.sort((a, b) => b.score! - a.score!);

    // Should never happen
    if (userIds.size === 0) {
      return res.json({
        beatmapsets: [],
        usersById: {},
      });
    }

    const usersById = groupBy<User['id'], User>(
      await db.query<User>(
        `
          SELECT *
          FROM users
          WHERE id IN (?)
        `,
        [[...userIds]],
      ),
      'id',
      null,
      true,
    );

    res.json({
      beatmapsets,
      usersById,
    });
  }),
);

guestRouter.get(
  '/survey',
  asyncHandler(async (req, res) => {
    if (
      config.surveyConfirmationSecret == null ||
      config.surveyId == null ||
      config.surveyLinkTemplate == null ||
      req.query.id !== config.surveyId
    ) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const user = res.typedLocals.user as UserWithRoles | undefined;

    if (user == null) {
      return res.redirect('/api/auth/begin?' + qs.stringify({ back: `/survey/${req.query.id}` }));
    }

    const confirmation = createHash('md5')
      .update(user.id + config.surveyConfirmationSecret)
      .digest('hex');
    const link = config.surveyLinkTemplate.replace('{confirmation}', `${user.id}-${confirmation}`);

    res.redirect(link);
  }),
);

guestRouter.get(
  '/team',
  asyncHandler(async (_, res) => {
    const roles = await db.queryWithGroups<UserRole & { user: User }>(
      `
        SELECT user_roles.*, users:user
        FROM users
        INNER JOIN user_roles
          ON users.id = user_roles.user_id
        WHERE user_roles.role_id IN (?)
        ORDER BY users.name ASC
      `,
      [[Role.captain, Role.metadata, Role.moderator, Role.newsEditor, Role.developer, Role.video]],
    );
    const groupedUsers: Record<
      'alumni' | 'current',
      Record<Role, Partial<Record<GameMode | -1, User[]>>>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    > = { alumni: {}, current: {} } as any;

    for (const role of roles) {
      const topGroup = role.alumni ? 'alumni' : 'current';

      if (groupedUsers[topGroup][role.role_id] == null) {
        groupedUsers[topGroup][role.role_id] = {};
      }

      if (groupedUsers[topGroup][role.role_id][role.game_mode] == null) {
        groupedUsers[topGroup][role.role_id][role.game_mode] = [];
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      groupedUsers[topGroup][role.role_id][role.game_mode]!.push(role.user);
    }

    res.json(groupedUsers);
  }),
);
