import { Router } from 'express';
import db from '../db';
import { asyncHandler } from '../express-helpers';
import { groupBy } from '../helpers';
import { Osu } from '../osu';
import { accessSetting } from '../settings';
import { isPollArray, isPollResultsArray, isRepliesRecord } from '../type-guards';

const interopRouter = Router();
export default interopRouter;

interopRouter.get(
  '/data',
  asyncHandler(async (req, res) => {
    if (req.query.roundId == null) {
      return res.status(422).json({ error: 'Missing round ID' });
    }

    const round:
      | (Round & { game_modes?: Record<GameMode, RoundGameMode>; news_author: User })
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
    const includesByNominationId = groupBy<
      Nomination['id'],
      {
        beatmap: (Beatmap & { excluded: boolean }) | null;
        creator: User | null;
        nomination_id: Nomination['id'];
      }
    >(
      await db.queryWithGroups<{
        beatmap: (Beatmap & { excluded: boolean }) | null;
        creator: User | null;
        nomination_id: Nomination['id'];
      }>(
        `
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
    const nominations: (Nomination & {
      beatmaps?: (Beatmap & { excluded: boolean })[];
      beatmapset: Beatmapset;
      beatmapset_creators?: User[];
      description_author: User | null;
      metadata_assignees?: User[];
      moderator_assignees?: User[];
      nominators?: User[];
    })[] = await db.queryWithGroups<
      Nomination & { beatmapset: Beatmapset; description_author: User | null }
    >(
      `
        SELECT nominations.*, beatmapsets:beatmapset, description_authors:description_author
        FROM nominations
        INNER JOIN beatmapsets
          ON nominations.beatmapset_id = beatmapsets.id
        LEFT JOIN users AS description_authors
          ON nominations.description_author_id = description_authors.id
        WHERE nominations.round_id = ?
        ORDER BY nominations.order ASC, nominations.id ASC
      `,
      [req.query.roundId],
    );

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
      nomination.beatmaps = (
        includesByNominationId[nomination.id]
          .map((include) => include.beatmap)
          .filter(
            (b1, i, all) => b1 != null && all.findIndex((b2) => b1.id === b2?.id) === i,
          ) as (Beatmap & { excluded: boolean })[]
      )
        .sort((a, b) => a.star_rating - b.star_rating)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .sort((a, b) => a.key_count! - b.key_count!);
      nomination.beatmapset_creators = includesByNominationId[nomination.id]
        .map((include) => include.creator)
        .filter(
          (c1, i, all) => c1 != null && all.findIndex((c2) => c1.id === c2?.id) === i,
        ) as User[];
      nomination.nominators = nominatorsByNominationId[nomination.id] || [];

      const assignees = assigneesByNominationId[nomination.id] || [];

      nomination.metadata_assignees = assignees
        .filter((a) => a.assignee_type === 0)
        .map((a) => a.assignee);
      nomination.moderator_assignees = assignees
        .filter((a) => a.assignee_type === 1)
        .map((a) => a.assignee);
    });

    const lastRoundResultsPostIds = groupBy<
      RoundGameMode['game_mode'],
      RoundGameMode['results_post_id']
    >(
      await db.query<Pick<RoundGameMode, 'game_mode' | 'results_post_id'>>(
        `
          SELECT game_mode, results_post_id
          FROM round_game_modes
          WHERE round_id = ?
        `,
        [parseInt(req.query.roundId) - 1], // TODO: naive
      ),
      'game_mode',
      'results_post_id',
      true,
    );

    res.json({
      discord_webhooks: [0, 1, 2, 3].map(
        (gameMode) => accessSetting(`discordWebhook.${gameMode}`) || null,
      ),
      nominations,
      // TODO may break when not all game modes are present
      results_post_ids: lastRoundResultsPostIds,
      round,
    });
  }),
);

interopRouter.get(
  '/forum-topic',
  asyncHandler(async (req, res) => {
    const topicId = parseInt(req.query.topicId ?? '', 10);

    if (isNaN(topicId)) {
      return res.status(422).json({ error: 'Invalid topic ID' });
    }

    // TODO waste of tokens and requests, it should re-use a client until token is invalid
    const osu = new Osu();
    await osu.getClientCredentialsToken();
    const topic = await osu.getForumTopic(topicId).catch(() => null);

    if (topic == null) {
      return res.status(404).json({ error: 'Invalid topic ID' });
    }

    if (topic.topic.first_post_id !== topic.posts[0].id) {
      return res
        .status(422)
        .json({ error: 'Topic `first_post_id` does not match the first post `id`' });
    }

    res.json({
      created_at: topic.topic.created_at,
      first_post_body: topic.posts[0].body.raw,
      first_post_id: topic.posts[0].id,
    });

    await osu.revokeToken();
  }),
);

interopRouter.get(
  '/poll-result-recent',
  asyncHandler(async (_, res) => {
    const pollResult = await db.queryOne<Pick<Poll, 'round_id' | 'topic_id'>>(`
      SELECT round_id, topic_id
      FROM polls
      ORDER BY ended_at DESC
      LIMIT 1
    `);

    res.json(pollResult);
  }),
);

interopRouter.post(
  '/polls',
  asyncHandler(async (req, res) => {
    if (!isPollArray(req.body)) {
      return res.status(422).json({ error: 'Body must be an array of polls' });
    }

    await db.query(
      'INSERT INTO polls (beatmapset_id, ended_at, game_mode, round_id, started_at, topic_id) VALUES ?',
      [
        req.body.map((poll) => [
          poll.beatmapsetId,
          new Date(poll.endedAt),
          poll.gameMode,
          poll.roundId,
          new Date(poll.startedAt),
          poll.topicId,
        ]),
      ],
    );

    res.status(204).send();
  }),
);

interopRouter.post(
  '/polls/complete',
  asyncHandler<unknown[]>(async (req, res) => {
    if (!isPollResultsArray(req.body)) {
      return res.status(422).json({ error: 'Body must be an array of poll results' });
    }

    await db.transact((connection) =>
      Promise.all(
        (
          req.body as {
            id: number;
            no: number;
            yes: number;
          }[]
        ).map((pollResults) =>
          connection.query(
            'UPDATE polls SET ? WHERE id = ? AND result_no IS NULL AND result_yes IS NULL',
            [{ result_no: pollResults.no, result_yes: pollResults.yes }, pollResults.id],
          ),
        ),
      ),
    );

    res.status(204).send();
  }),
);

interopRouter.get(
  '/polls/incomplete',
  asyncHandler(async (_, res) => {
    res.json(
      await db.query<Poll>(`
        SELECT *
        FROM polls
        WHERE result_no IS NULL
          OR result_yes IS NULL
      `),
    );
  }),
);

interopRouter.get(
  '/rounds-available',
  asyncHandler(async (_, res) => {
    res.json(
      await db.query<Round & { nomination_count: number }>(`
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
  }),
);

interopRouter.post(
  '/results-post-ids',
  asyncHandler(async (req, res) => {
    if (typeof req.body.roundId !== 'number') {
      return res.status(422).json({ error: 'Missing round ID' });
    }

    if (!isRepliesRecord(req.body.replies) || Object.keys(req.body.replies).length === 0) {
      return res.status(422).json({ error: 'Missing reply IDs' });
    }

    if ((await db.queryOne('SELECT 1 FROM rounds WHERE id = ?', [req.body.roundId])) == null) {
      return res.status(422).json({ error: 'Invalid round ID' });
    }

    await db.transact((connection) =>
      Promise.all(
        Object.entries(req.body.replies as Record<GameMode, number>).map(([gameMode, postId]) =>
          connection.query(
            `
              UPDATE round_game_modes
              SET results_post_id = ?
              WHERE round_id = ?
                AND game_mode = ?
                AND results_post_id IS NULL
            `,
            [postId, req.body.roundId, gameMode],
          ),
        ),
      ),
    );

    res.status(204).send();
  }),
);
