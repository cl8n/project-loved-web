import { inspect } from 'util';

const syslogPrefix = process.env.LOG_SYSLOG_LEVEL_PREFIX === '1';

export function systemLog(message: unknown, level: SyslogLevel): void {
  if (syslogPrefix) {
    if (typeof message !== 'string') {
      message = inspect(message, { depth: null });
    }

    message = (message as string)
      .trim()
      .split('\n')
      .map((line) => `<${level}>${line}`)
      .join('\n');
  }

  if (level <= SyslogLevel.warning) {
    console.error(message);
  } else {
    console.log(message);
  }
}
