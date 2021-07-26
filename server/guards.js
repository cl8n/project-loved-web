const { createHash, timingSafeEqual } = require('crypto');
const config = require('./config');

const allRoles = ['alumni', 'captain', 'metadata', 'moderator', 'news'];

function isGod(method, user) {
  return user.roles.god || (method === 'GET' && user.roles.god_readonly);
}

function hasRole(method, user, roles) {
  return isGod(method, user) || roles.some((role) => user.roles[role]);
}

function hasRoleMiddleware(roles, errorMessage) {
  return function (request, response, next) {
    if (!hasRole(request.method, response.locals.user, roles))
      return response.status(403).json({ error: errorMessage });

    next();
  };
}

function timingSafeStringEqual(a, b) {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();

  return timingSafeEqual(aHash, bHash);
}

module.exports.hasLocalInteropKey = function (request, response, next) {
  const key = request.get('X-Loved-InteropKey');

  if (key == null)
    return response.status(422).json({ error: 'Missing key' });

  if (!timingSafeStringEqual(config.localInteropKey, key))
    return response.status(401).json({ error: 'Invalid key' });

  next();
};

module.exports.isCaptainForGameMode = function (request, response, next) {
  const gameMode = request.param('gameMode');
  const user = response.locals.user;

  if (gameMode == null)
    return response.status(400).json({ error: 'No game mode provided' });

  if (!isGod(request.method, user) && user.roles.captain_game_mode !== gameMode)
    return response.status(403).json({ error: `Must be a captain for mode ${gameMode}` });

  next();
};

module.exports.roles = function (request, response) {
  function isCaptain(gameMode) {
    return isGod(request.method, response.locals.user) || response.locals.user.roles.captain_game_mode === gameMode;
  }

  const roles = {
    gameModes: [0, 1, 2, 3].map((gameMode) => isCaptain(gameMode)),
  };

  for (const role of allRoles) {
    roles[role] = hasRole(request.method, response.locals.user, [role]);
  }

  return roles;
};

module.exports.isAnything = hasRoleMiddleware(allRoles, 'Must have a role');
module.exports.isCaptain = hasRoleMiddleware(['captain'], 'Must be a captain');
module.exports.isGod = hasRoleMiddleware([], 'Must be God');
module.exports.isMetadataChecker = hasRoleMiddleware(['metadata'], 'Must be a metadata checker');
module.exports.isModerator = hasRoleMiddleware(['moderator'], 'Must be a moderator');
module.exports.isNewsAuthor = hasRoleMiddleware(['news'], 'Must be a news author');
