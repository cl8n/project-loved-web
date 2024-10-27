import { Router } from 'express';
import type { User } from 'loved-bridge/tables';
import { createHash } from 'node:crypto';
import config from '../config.js';
import db from '../db.js';
import { asyncHandler } from '../express-helpers.js';

const googleInteropRouter = Router();
export default googleInteropRouter;

googleInteropRouter.get(
  '/user-from-survey',
  asyncHandler(async (request, response) => {
    if (
      config.surveyConfirmationSecret == null ||
      config.surveyId == null ||
      config.surveyLinkTemplate == null ||
      request.query.id !== config.surveyId
    ) {
      return response.status(404).json({ error: 'Survey not found' });
    }

    if (
      typeof request.query.confirmation !== 'string' ||
      !/^[0-9]+-[a-z0-9]{32}$/.test(request.query.confirmation)
    ) {
      return response.status(422).json({ error: 'Invalid confirmation code' });
    }

    const [userId, confirmation] = request.query.confirmation.split('-');

    const expectedConfirmation = createHash('md5')
      .update(userId)
      .update(request.query.id)
      .update(config.surveyConfirmationSecret)
      .digest('hex');

    if (confirmation !== expectedConfirmation) {
      return response.send('0,Error: Invalid confirmation');
    }

    const user = await db.queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);

    if (user == null) {
      return response.send('0,Error: User not found');
    }

    response.send(`${user.id},${user.name}`);
  }),
);
