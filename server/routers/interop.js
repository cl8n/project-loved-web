const { Router } = require('express');
const db = require('../db');
const { asyncHandler } = require('../express-helpers');

const router = Router();

router.get('/data', asyncHandler(async (req, res) => {
  if (req.query.roundId == null)
    return res.status(422).json({ error: 'Missing round ID' });

  const round = await db.queryOne(`
    SELECT *
    FROM rounds
    WHERE id = ?
  `, req.query.roundId);
  const nominations = await db.query(`
    SELECT *
    FROM nominations
    WHERE round_id = ?
  `, req.query.roundId);

  res.json({
    nominations,
    round,
  });
}));

router.get('/rounds-available', asyncHandler(async (_, res) => {
  res.json(
    await db.query(`
      SELECT *
      FROM rounds
      WHERE done = 0
      ORDER BY id DESC
    `),
  );
}));

module.exports = router;
