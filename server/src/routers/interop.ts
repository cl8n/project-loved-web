import { Router } from 'express';
import type { GameMode } from 'loved-bridge/beatmaps/gameMode';
import { gameModeLongName, gameModes } from 'loved-bridge/beatmaps/gameMode';
import type {
  Beatmap,
  Beatmapset,
  ExtraToken,
  Nomination,
  NominationAssignee,
  Poll,
  Round,
  RoundGameMode,
  User,
} from 'loved-bridge/tables';
import { LogType } from 'loved-bridge/tables';
import { deleteCache } from '../cache.js';
import config from '../config.js';
import db from '../db.js';
import { asyncHandler } from '../express-helpers.js';
import { groupBy, pick, sortCreators } from '../helpers.js';
import { dbLog } from '../log.js';
import {
  mainClosingReply,
  mainPostTitle,
  nominationClosingReply,
  nominationPollTitle,
  nominationTopicTitle,
} from '../news.js';
import { Osu } from '../osu.js';
import { accessSetting } from '../settings.js';
import { isNewsRequestBody, isResultsRequestBody } from '../type-guards.js';

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
              AND nominations.game_mode = beatmaps.game_mode
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
      news_editor_assignees?: User[];
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
    ) as Record<RoundGameMode['game_mode'], RoundGameMode>;

    nominations.forEach((nomination) => {
      nomination.beatmaps = (beatmapsByNominationId[nomination.id] || [])
        .sort((a, b) => a.star_rating - b.star_rating)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .sort((a, b) => a.key_count! - b.key_count!);
      nomination.beatmapset_creators = sortCreators(
        beatmapsetCreatorsByNominationId[nomination.id] || [],
        nomination.beatmapset.creator_id,
      );
      nomination.nominators = nominatorsByNominationId[nomination.id] || [];

      const assignees = assigneesByNominationId[nomination.id] || [];

      nomination.metadata_assignees = assignees
        .filter((a) => a.assignee_type === 'metadata')
        .map((a) => a.assignee);
      nomination.moderator_assignees = assignees
        .filter((a) => a.assignee_type === 'moderator')
        .map((a) => a.assignee);
      nomination.news_editor_assignees = assignees
        .filter((a) => a.assignee_type === 'news_editor')
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
        [parseInt(req.query.roundId, 10) - 1], // TODO: naive
      ),
      'game_mode',
      'results_post_id',
      true,
    );

    res.json({
      discord_webhooks: gameModes.map(
        (gameMode) => accessSetting(`discordWebhook.${gameMode}`) || null,
      ),
      nominations,
      // TODO may break when not all game modes are present
      results_post_ids: lastRoundResultsPostIds,
      round,
    });
  }),
);

interopRouter.post(
  '/news',
  asyncHandler(async (req, res) => {
    if (!isNewsRequestBody(req.body)) {
      return res.status(422).json({ error: 'Invalid request body' });
    }

    // TODO: Build topic bodies (currently done by management client)
    const { mainTopicBodies, nominationTopicBodies, roundId } = req.body;
    const round = await db.queryOne<Pick<Round, 'id' | 'name' | 'news_author_id'>>(
      `
        SELECT id, name, news_author_id
        FROM rounds
        WHERE id = ?
      `,
      [roundId],
    );

    if (round == null) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const nominations = await db.queryWithGroups<Nomination & { beatmapset: Beatmapset }>(
      `
        SELECT nominations.*, beatmapsets:beatmapset
        FROM nominations
        INNER JOIN beatmapsets
          ON nominations.beatmapset_id = beatmapsets.id
        WHERE nominations.round_id = ?
        ORDER BY nominations.order ASC, nominations.id ASC
      `,
      [roundId],
    );

    const nominationIdsMissingAuthor = nominations
      .filter((nomination) => nomination.description_author_id == null)
      .map((nomination) => nomination.id);

    if (nominationIdsMissingAuthor.length > 0) {
      return res.status(422).json({
        error: `No description author for nominations ${nominationIdsMissingAuthor.join(', ')}`,
      });
    }

    const nominationIdsMissingTopicBody = nominations
      .map((nomination) => nomination.id)
      .filter((id) => nominationTopicBodies[id] == null);

    if (nominationIdsMissingTopicBody.length > 0) {
      return res.status(422).json({
        error: `Missing topic body for nominations ${nominationIdsMissingTopicBody.join(', ')}`,
      });
    }

    const newsAuthorExtraToken = await db.queryOne<Pick<ExtraToken, 'token'>>(
      `
        SELECT token
        FROM extra_tokens
        WHERE user_id = ?
      `,
      [round.news_author_id],
    );

    if (newsAuthorExtraToken == null) {
      return res.status(403).json({ error: 'News author does not have forum write permission' });
    }

    const newsAuthorOsu = new Osu(newsAuthorExtraToken.token);

    try {
      const newToken = await newsAuthorOsu.tryRefreshToken();

      if (newToken != null) {
        await db.query(
          `
            UPDATE extra_tokens
            SET token = ?
            WHERE user_id = ?
          `,
          [JSON.stringify(newToken), round.news_author_id],
        );
      }
    } catch {
      return res.status(403).json({
        error: 'Error refreshing forum write token for news author. Re-authorize and try again',
      });
    }

    const captainExtraTokens = await db.query<ExtraToken>(
      `
        SELECT *
        FROM extra_tokens
        WHERE user_id IN (?)
      `,
      [nominations.map((nomination) => nomination.description_author_id)],
    );
    const captainOsuByUserId: Partial<Record<number, Osu>> = {};
    const refreshErrorUserIds: number[] = [];

    for (const extraToken of captainExtraTokens) {
      const osu = new Osu(extraToken.token);
      captainOsuByUserId[extraToken.user_id] = osu;

      const newToken = await osu.tryRefreshToken().catch(() => {
        refreshErrorUserIds.push(extraToken.user_id);
      });

      if (newToken != null) {
        await db.query(
          `
            UPDATE extra_tokens
            SET token = ?
            WHERE user_id = ?
          `,
          [JSON.stringify(newToken), extraToken.user_id],
        );
      }
    }

    if (refreshErrorUserIds.length > 0) {
      return res.status(403).json({
        error:
          `Error refreshing forum write token for users ${refreshErrorUserIds.join(', ')}.` +
          '\nAsk them to re-authorize, then try again',
      });
    }

    const firstPostsByNominationId: Partial<Record<number, { body: string; id: number }>> = {};
    const gameModesReversed = [...gameModes].reverse();
    const nominationTopicIds: Partial<Record<number, number>> = {};

    // Post in reverse so that it looks in-order on the topic listing
    for (const gameMode of gameModesReversed) {
      const nominationsForModeReversed = nominations
        .filter((nomination) => nomination.game_mode === gameMode)
        .reverse();

      for (const nomination of nominationsForModeReversed) {
        const existingPoll = await db.queryOne<Pick<Poll, 'topic_id'>>(
          `
            SELECT topic_id
            FROM polls
            WHERE beatmapset_id = ?
              AND game_mode = ?
              AND round_id = ?
          `,
          [nomination.beatmapset_id, gameMode, roundId],
        );

        if (existingPoll == null) {
          const nominationOsu =
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            captainOsuByUserId[nomination.description_author_id!] ?? newsAuthorOsu;
          const topic = await nominationOsu.createForumTopic(
            config.osuLovedForumId,
            nominationTopicTitle(nomination),
            nominationTopicBodies[nomination.id],
            {
              poll: {
                hideResults: true,
                lengthDays: 10,
                maxOptions: 1,
                options: ['Yes', 'No'],
                title: nominationPollTitle(nomination),
                voteChangeAllowed: true,
              },
            },
          );

          if (topic?.topic.poll?.ended_at == null) {
            throw `Unexpected nomination topic response from osu! API for nomination #${nomination.id}`;
          }

          await db.transact(async (connection) => {
            const { insertId: pollId } = await connection.query('INSERT INTO polls SET ?', [
              {
                beatmapset_id: nomination.beatmapset_id,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ended_at: new Date(topic.topic.poll!.ended_at!),
                game_mode: gameMode,
                round_id: roundId,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                started_at: new Date(topic.topic.poll!.started_at),
                topic_id: topic.topic.id,
              },
            ]);
            await dbLog(
              LogType.pollCreated,
              {
                actor: pick(res.typedLocals.user, ['banned', 'country', 'id', 'name']),
                beatmapset: {
                  artist: nomination.overwrite_artist ?? nomination.beatmapset.artist,
                  id: nomination.beatmapset_id,
                  title: nomination.overwrite_title ?? nomination.beatmapset.title,
                },
                gameMode,
                poll: {
                  id: pollId,
                  topic_id: topic.topic.id,
                },
                round: pick(round, ['id', 'name']),
              },
              connection,
            );
          });

          deleteCache('polls');
          deleteCache(`submissions:${gameMode}:polls`);

          firstPostsByNominationId[nomination.id] = {
            body: topic.post.body.raw,
            id: topic.post.id,
          };
          nominationTopicIds[nomination.id] = topic.topic.id;
        } else {
          const topic = await newsAuthorOsu.getForumTopic(existingPoll.topic_id);

          if (topic?.topic.poll?.ended_at == null) {
            throw `Unexpected nomination topic response from osu! API for nomination #${nomination.id}`;
          }

          firstPostsByNominationId[nomination.id] = {
            body: topic.posts[0].body.raw,
            id: topic.posts[0].id,
          };
          nominationTopicIds[nomination.id] = topic.topic.id;
        }
      }
    }

    const mainPostTopicIdsByGameMode: Partial<Record<GameMode, number>> = {};

    // Post in reverse so that it looks in-order on the topic listing
    for (const gameMode of gameModesReversed) {
      const mainTopicBody = mainTopicBodies[gameMode];

      if (mainTopicBody == null) {
        continue;
      }

      const topic = await newsAuthorOsu.createForumTopic(
        config.osuLovedForumId,
        mainPostTitle(gameMode, round),
        mainTopicBody.replace(
          /{{(\d+)_TOPIC_ID}}/g,
          (_, nominationId) => nominationTopicIds[nominationId]?.toString() ?? '',
        ),
      );

      if (topic == null) {
        throw (
          'Unexpected main topic response from osu! API for game mode ' + gameModeLongName(gameMode)
        );
      }

      mainPostTopicIdsByGameMode[gameMode] = topic.topic.id;
    }

    for (const nomination of nominations) {
      const firstPost = firstPostsByNominationId[nomination.id];
      const mainPostTopicId = mainPostTopicIdsByGameMode[nomination.game_mode];

      if (firstPost == null || mainPostTopicId == null) {
        throw `Missing first post or main topic ID for nomination #${nomination.id}`;
      }

      const nominationOsu =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        captainOsuByUserId[nomination.description_author_id!] ?? newsAuthorOsu;

      nominationOsu.updateForumPost(
        firstPost.id,
        firstPost.body.replace('{{MAIN_TOPIC_ID}}', mainPostTopicId.toString()),
      );
    }

    deleteCache('current-news-post');

    res.json({
      mainTopicIds: Object.values(mainPostTopicIdsByGameMode),
      nominationTopicIds,
    });

    // TODO: Pin main topics (currently done by management client)
    // TODO: Post Discord announcements (currently done by management client)
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
  '/results',
  asyncHandler(async (req, res) => {
    if (!isResultsRequestBody(req.body)) {
      return res.status(422).json({ error: 'Invalid request body' });
    }

    const round = await db.queryOne<Round>(
      `
        SELECT *
        FROM rounds
        WHERE id = ?
      `,
      [req.body.roundId],
    );

    if (round == null) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const roundGameModes = groupBy<RoundGameMode['game_mode'], RoundGameMode>(
      await db.query<RoundGameMode>(
        `
          SELECT *
          FROM round_game_modes
          WHERE round_id = ?
        `,
        [round.id],
      ),
      'game_mode',
      null,
      true,
    ) as Record<RoundGameMode['game_mode'], RoundGameMode>;

    const nominations = await db.queryWithGroups<
      Nomination & {
        beatmapset: Beatmapset;
        beatmapset_creators?: User[];
        poll:
          | (Poll & {
              passed?: boolean;
              yesRatio?: number;
            })
          | null;
      }
    >(
      `
        SELECT nominations.*, beatmapsets:beatmapset, polls:poll
        FROM nominations
        INNER JOIN beatmapsets
          ON nominations.beatmapset_id = beatmapsets.id
        LEFT JOIN polls
          ON nominations.beatmapset_id = polls.beatmapset_id
          AND nominations.game_mode = polls.game_mode
          AND nominations.round_id = polls.round_id
        WHERE nominations.round_id = ?
        ORDER BY nominations.order ASC, nominations.id ASC
      `,
      [round.id],
    );

    const nominationIdsMissingAuthor = nominations
      .filter((nomination) => nomination.description_author_id == null)
      .map((nomination) => nomination.id);

    if (nominationIdsMissingAuthor.length > 0) {
      return res.status(422).json({
        error: `No description author for nominations ${nominationIdsMissingAuthor.join(', ')}`,
      });
    }

    const now = new Date();
    for (const nomination of nominations) {
      if (nomination.poll == null || nomination.poll.ended_at > now) {
        return res.status(422).json({ error: 'Polls are not yet complete' });
      }

      if (nomination.poll.result_no != null || nomination.poll.result_yes != null) {
        return res.status(422).json({ error: 'Poll results have already been stored' });
      }
    }

    const gameModesPresentReversed: GameMode[] = [];

    for (const gameMode of [...gameModes].reverse()) {
      const gameModeHasNominations = nominations.some(
        (nomination) => nomination.game_mode === gameMode,
      );

      if ((req.body.mainTopicIds[gameMode] != null) !== gameModeHasNominations) {
        return res.status(422).json({
          error: `Nominations and main topics do not agree about ${gameModeLongName(
            gameMode,
          )}'s presence`,
        });
      }

      if (gameModeHasNominations) {
        gameModesPresentReversed.push(gameMode);
      }
    }

    const beatmapsetCreatorsByNominationId = groupBy<Nomination['id'], User>(
      await db.queryWithGroups<{
        id: Nomination['id'];
        creator: User;
      }>(
        `
          SELECT nominations.id, creators:creator
          FROM nominations
          INNER JOIN beatmapset_creators
            ON nominations.id = beatmapset_creators.nomination_id
          INNER JOIN users AS creators
            ON beatmapset_creators.creator_id = creators.id
          WHERE nominations.round_id = ?
        `,
        [round.id],
      ),
      'id',
      'creator',
    );

    const clientCredentialsOsu = new Osu();
    await clientCredentialsOsu.getClientCredentialsToken();

    for (const nomination of nominations) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const poll = nomination.poll!;
      const topic = await clientCredentialsOsu.getForumTopic(poll.topic_id);

      if (
        topic?.topic.poll == null ||
        topic.topic.poll.options.length !== 2 ||
        topic.topic.poll.options[0].text.bbcode !== 'Yes' ||
        topic.topic.poll.options[1].text.bbcode !== 'No' ||
        topic.topic.poll.options[0].vote_count == null ||
        topic.topic.poll.options[1].vote_count == null
      ) {
        throw `Unexpected nomination poll response from osu! API for nomination #${nomination.id}`;
      }

      poll.result_yes = topic.topic.poll.options[0].vote_count;
      poll.result_no = topic.topic.poll.options[1].vote_count;
      poll.yesRatio = poll.result_yes / (poll.result_no + poll.result_yes);
      poll.passed = poll.yesRatio >= roundGameModes[nomination.game_mode].voting_threshold;

      nomination.beatmapset_creators = sortCreators(
        beatmapsetCreatorsByNominationId[nomination.id] || [],
        nomination.beatmapset.creator_id,
      );
    }

    const nominationsChecked = nominations as (Nomination & {
      beatmapset: Beatmapset;
      beatmapset_creators: User[];
      description_author_id: number;
      poll: Poll & {
        passed: boolean;
        result_no: number;
        result_yes: number;
        yesRatio: number;
      };
    })[];

    const newsAuthorExtraToken = await db.queryOne<Pick<ExtraToken, 'token'>>(
      `
        SELECT token
        FROM extra_tokens
        WHERE user_id = ?
      `,
      [round.news_author_id],
    );

    if (newsAuthorExtraToken == null) {
      return res.status(403).json({ error: 'News author does not have forum write permission' });
    }

    const newsAuthorOsu = new Osu(newsAuthorExtraToken.token);

    try {
      const newToken = await newsAuthorOsu.tryRefreshToken();

      if (newToken != null) {
        await db.query(
          `
            UPDATE extra_tokens
            SET token = ?
            WHERE user_id = ?
          `,
          [JSON.stringify(newToken), round.news_author_id],
        );
      }
    } catch {
      return res.status(403).json({
        error: 'Error refreshing forum write token for news author. Re-authorize and try again',
      });
    }

    const captainExtraTokens = await db.query<ExtraToken>(
      `
        SELECT *
        FROM extra_tokens
        WHERE user_id IN (?)
      `,
      [nominationsChecked.map((nomination) => nomination.description_author_id)],
    );
    const captainOsuByUserId: Partial<Record<number, Osu>> = {};
    const refreshErrorUserIds: number[] = [];

    for (const extraToken of captainExtraTokens) {
      const osu = new Osu(extraToken.token);
      captainOsuByUserId[extraToken.user_id] = osu;

      const newToken = await osu.tryRefreshToken().catch(() => {
        refreshErrorUserIds.push(extraToken.user_id);
      });

      if (newToken != null) {
        await db.query(
          `
            UPDATE extra_tokens
            SET token = ?
            WHERE user_id = ?
          `,
          [JSON.stringify(newToken), extraToken.user_id],
        );
      }
    }

    if (refreshErrorUserIds.length > 0) {
      return res.status(403).json({
        error:
          `Error refreshing forum write token for users ${refreshErrorUserIds.join(', ')}.` +
          '\nAsk them to re-authorize, then try again',
      });
    }

    // Post in reverse so that it looks in-order on the topic listing
    for (const gameMode of gameModesPresentReversed) {
      const nominationsForModeReversed = nominationsChecked
        .filter((nomination) => nomination.game_mode === gameMode)
        .reverse();

      for (const nomination of nominationsForModeReversed) {
        const osu = captainOsuByUserId[nomination.description_author_id] ?? newsAuthorOsu;

        await osu.createForumTopicReply(
          nomination.poll.topic_id,
          nominationClosingReply(nomination),
        );
      }
    }

    // Post in reverse so that it looks in-order on the topic listing
    for (const gameMode of gameModesPresentReversed) {
      const post = await newsAuthorOsu.createForumTopicReply(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        req.body.mainTopicIds[gameMode]!,
        mainClosingReply(
          nominationsChecked.filter((nomination) => nomination.game_mode === gameMode),
          roundGameModes[gameMode].voting_threshold,
        ),
      );

      if (post == null) {
        throw `Unexpected main reply response from osu! API for game mode ${gameModeLongName(
          gameMode,
        )}`;
      }

      await db.query(
        `
          UPDATE round_game_modes
          SET results_post_id = ?
          WHERE round_id = ?
            AND game_mode = ?
            AND results_post_id IS NULL
        `,
        [post.id, round.id, gameMode],
      );
    }

    await db.transact(async (connection) => {
      for (const nomination of nominationsChecked) {
        await connection.query('UPDATE polls SET ? WHERE id = ?', [
          pick(nomination.poll, ['result_no', 'result_yes']),
          nomination.poll.id,
        ]);
        await dbLog(
          LogType.pollUpdated,
          {
            actor: pick(res.typedLocals.user, ['banned', 'country', 'id', 'name']),
            beatmapset: {
              artist: nomination.overwrite_artist ?? nomination.beatmapset.artist,
              id: nomination.beatmapset_id,
              title: nomination.overwrite_title ?? nomination.beatmapset.title,
            },
            gameMode: nomination.game_mode,
            poll: pick(nomination.poll, ['id', 'topic_id']),
            round: pick(round, ['id', 'name']),
          },
          connection,
        );
      }
    });

    deleteCache('current-news-post');
    deleteCache('polls');
    for (const gameMode of gameModesPresentReversed) {
      deleteCache(`submissions:${gameMode}:polls`);
    }

    res.status(204).send();
  }),
);

interopRouter.get(
  '/topic-ids',
  asyncHandler(async (req, res) => {
    if (req.query.roundId == null) {
      return res.status(422).json({ error: 'Missing round ID' });
    }

    res.json(
      groupBy<Nomination['id'], Poll['topic_id']>(
        await db.query<Pick<Nomination, 'id'> & Pick<Poll, 'topic_id'>>(
          `
            SELECT nominations.id, polls.topic_id
            FROM nominations
            INNER JOIN polls
              ON nominations.beatmapset_id = polls.beatmapset_id
              AND nominations.game_mode = polls.game_mode
              AND nominations.round_id = polls.round_id
            WHERE nominations.round_id = ?
          `,
          [req.query.roundId],
        ),
        'id',
        'topic_id',
        true,
      ),
    );
  }),
);
