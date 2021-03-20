const { timingSafeEqual } = require('crypto');
const config = require('./config.json');

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

module.exports.hasLocalInterOpKey = function (request, response, next) {
  if (!timingSafeEqual(config.localInterOpKey, request.get('X-Loved-InterOpKey')))
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

module.exports.isAnything = hasRoleMiddleware(['captain', 'metadata', 'moderator', 'news'], 'Must have a role');
module.exports.isCaptain = hasRoleMiddleware(['captain'], 'Must be a captain');
module.exports.isGod = hasRoleMiddleware([], 'Must be God');
module.exports.isMetadataChecker = hasRoleMiddleware(['metadata'], 'Must be a metadata checker');
module.exports.isModerator = hasRoleMiddleware(['moderator'], 'Must be a moderator');
module.exports.isNewsAuthor = hasRoleMiddleware(['news'], 'Must be a news author');
