import 'dotenv/config';
import { isAbsolute } from 'path';

interface Config {
  httpsAlways: boolean;
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
  osuBaseUrlExternal: string;
  osuLovedForumId: number;
  osuClientId: number;
  osuClientRedirect: string;
  osuClientSecret: string;
  surveyConfirmationSecret: string | undefined;
  surveyId: string | undefined;
  surveyLinkTemplate: string | undefined;
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

function tryParseString(value: string | null | undefined): string | undefined {
  if (value) {
    return value;
  }
}

partialConfig.httpsAlways = tryParseBoolean(process.env.HTTPS_ALWAYS);
partialConfig.port = tryParseInt(process.env.PORT);
partialConfig.sessionSecret = tryParseString(process.env.SESSION_SECRET);
partialConfig.storagePath = tryParseString(process.env.STORAGE_PATH);
partialConfig.dbDatabase = tryParseString(process.env.DB_DATABASE);
partialConfig.dbHost = tryParseString(process.env.DB_HOST);
partialConfig.dbPassword = process.env.DB_PASSWORD;
partialConfig.dbPort = tryParseInt(process.env.DB_PORT);
partialConfig.dbUser = tryParseString(process.env.DB_USER);
partialConfig.syslogLevelPrefix = tryParseBoolean(process.env.LOG_SYSLOG_LEVEL_PREFIX);
partialConfig.osuBaseUrl = tryParseString(process.env.OSU_BASE_URL);
partialConfig.osuBaseUrlExternal = tryParseString(process.env.OSU_BASE_URL_EXTERNAL);
partialConfig.osuLovedForumId = tryParseInt(process.env.OSU_LOVED_FORUM_ID);
partialConfig.osuClientId = tryParseInt(process.env.OSU_CLIENT_ID);
partialConfig.osuClientRedirect = tryParseString(process.env.OSU_CLIENT_REDIRECT);
partialConfig.osuClientSecret = tryParseString(process.env.OSU_CLIENT_SECRET);
partialConfig.surveyConfirmationSecret = tryParseString(process.env.SURVEY_CONFIRMATION_SECRET);
partialConfig.surveyId = tryParseString(process.env.SURVEY_ID);
partialConfig.surveyLinkTemplate = tryParseString(process.env.SURVEY_LINK_TEMPLATE);

const optionalOptions = new Set([
  'osuBaseUrlExternal',
  'surveyConfirmationSecret',
  'surveyId',
  'surveyLinkTemplate',
]);

for (const [option, value] of Object.entries(partialConfig)) {
  if (value == null && !optionalOptions.has(option)) {
    throw `Invalid config option ${option}: not set`;
  }
}

if (!isAbsolute(config.storagePath)) {
  throw 'Invalid config option storagePath: must be an absolute path';
}

if (!config.osuClientRedirect.endsWith('/auth/callback')) {
  throw 'Invalid config option osuClientRedirect: must end with "/auth/callback"';
}

if (config.surveyLinkTemplate != null && !config.surveyLinkTemplate.includes('{confirmation}')) {
  throw 'Invalid config option surveyLinkTemplate: must include "{confirmation}"';
}

config.osuBaseUrl = config.osuBaseUrl.replace(/\/+$/, '');
config.osuBaseUrlExternal ??= config.osuBaseUrl;
