import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import config from './config.js';
import { accessNested } from './helpers.js';

const storagePath = normalize(config.storagePath);
const settingsPath = join(storagePath, 'settings.json');

if (!existsSync(storagePath)) {
  mkdirSync(storagePath);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const settings: Record<string, any> = existsSync(settingsPath)
  ? JSON.parse(readFileSync(settingsPath, 'utf8'))
  : (writeFileSync(settingsPath, '{}'), {});

function updateSetting(key: string, value: unknown): boolean {
  const keyParts = key.split('.');
  let modifyingScope = settings;

  for (const keyPart of keyParts.slice(0, -1)) {
    if (modifyingScope[keyPart] === undefined) {
      modifyingScope[keyPart] = {};
    } else if (!(modifyingScope[keyPart] instanceof Object)) {
      throw 'Invalid setting path';
    }

    modifyingScope = modifyingScope[keyPart];
  }

  if (modifyingScope[keyParts[keyParts.length - 1]] === value) {
    return false;
  } else {
    modifyingScope[keyParts[keyParts.length - 1]] = value;
    return true;
  }
}

export function accessSetting<T>(key: string): T {
  return accessNested(settings, key);
}

export function updateSettings(newSettings: Record<string, unknown>): string[] {
  const modifiedSettings: string[] = [];

  for (const [key, value] of Object.entries(newSettings)) {
    if (updateSetting(key, value)) {
      modifiedSettings.push(key);
    }
  }

  writeFileSync(settingsPath, JSON.stringify(settings));

  return modifiedSettings;
}
