import 'dotenv/config';
import { isAbsolute } from 'path';

interface Config {
  httpsAlways: boolean;
  interopVersion: number;
  port: number;
  sessionSecret: string;
  storagePath: string;
  dbDatabase: string;
  dbHost: string;
  dbPassword: string;
  dbPort: number;
  dbUser: string;
  syslogLevelPrefix: boolean;
  osuBaseUrl: string;
  osuLovedForumId: number;
  osuClientId: number;
  osuClientRedirect: string;
  osuClientSecret: string;
  surveyConfirmationSecret: string;
  surveyId: string;
  surveyLinkTemplate: string;
}

const partialConfig: { [K in keyof Config]?: Config[K] | undefined } = {};
const config = partialConfig as Config;
export default config;

function tryParseBoolean(value: string | null | undefined): boolean | undefined {
  if (value === '1' || value === 'true') {
    return true;
  }

  if (value === '0' || value === 'false') {
    return false;
  }
}

function tryParseInt(value: string | null | undefined): number | undefined {
  if (value == null) {
    return;
  }

  const number = parseInt(value, 10);

  if (!isNaN(number)) {
    return number;
  }
}

partialConfig.httpsAlways = tryParseBoolean(process.env.HTTPS_ALWAYS);
partialConfig.interopVersion = tryParseInt(process.env.INTEROP_VERSION);
partialConfig.port = tryParseInt(process.env.PORT);
partialConfig.sessionSecret = process.env.SESSION_SECRET;
partialConfig.storagePath = process.env.STORAGE_PATH;
partialConfig.dbDatabase = process.env.DB_DATABASE;
partialConfig.dbHost = process.env.DB_HOST;
partialConfig.dbPassword = process.env.DB_PASSWORD;
partialConfig.dbPort = tryParseInt(process.env.DB_PORT);
partialConfig.dbUser = process.env.DB_USER;
partialConfig.syslogLevelPrefix = tryParseBoolean(process.env.LOG_SYSLOG_LEVEL_PREFIX);
partialConfig.osuBaseUrl = process.env.OSU_BASE_URL;
partialConfig.osuLovedForumId = tryParseInt(process.env.OSU_LOVED_FORUM_ID);
partialConfig.osuClientId = tryParseInt(process.env.OSU_CLIENT_ID);
partialConfig.osuClientRedirect = process.env.OSU_CLIENT_REDIRECT;
partialConfig.osuClientSecret = process.env.OSU_CLIENT_SECRET;
partialConfig.surveyConfirmationSecret = process.env.SURVEY_CONFIRMATION_SECRET;
partialConfig.surveyId = process.env.SURVEY_ID;
partialConfig.surveyLinkTemplate = process.env.SURVEY_LINK_TEMPLATE;

for (const [option, value] of Object.entries(partialConfig)) {
  if (value == null) {
    throw `Invalid config option ${option}: not set`;
  }
}

if (!isAbsolute(config.storagePath)) {
  throw 'Invalid config option storagePath: must be an absolute path';
}

if (!config.osuClientRedirect.endsWith('/auth/callback')) {
  throw 'Invalid config option osuClientRedirect: must end with "/auth/callback"';
}

if (!config.surveyLinkTemplate.includes('{confirmation}')) {
  throw 'Invalid config option surveyLinkTemplate: must include "{confirmation}"';
}
