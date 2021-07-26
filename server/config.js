const config = require('./config.json');

const environmentMappings = [
  ['dbDatabase', 'DB_DATABASE'],
  ['dbHost', 'DB_HOST'],
  ['dbPassword', 'DB_PASSWORD'],
  ['dbPort', 'DB_PORT'],
  ['dbUser', 'DB_USER'],
  ['localInteropKey', 'LOCAL_INTEROP_KEY'],
  ['osuApiClientId', 'OSU_API_CLIENT_ID'],
  ['osuApiClientRedirect', 'OSU_API_CLIENT_REDIRECT'],
  ['osuApiClientSecret', 'OSU_API_CLIENT_SECRET'],
  ['port', 'API_PORT'],
  ['sessionSecret', 'SESSION_SECRET'],
];

for (const [configOption, environmentParameter] of environmentMappings) {
  const environmentVariable = process.env[environmentParameter];

  if (environmentVariable != null)
    config[configOption] = environmentVariable;
}

module.exports = config;
