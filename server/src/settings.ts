import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, isAbsolute, normalize } from 'path';
import { accessNested } from './helpers';

if (process.env.STORAGE_PATH == null || !isAbsolute(process.env.STORAGE_PATH)) {
  throw 'Invalid storage path';
}

const storagePath = normalize(process.env.STORAGE_PATH);
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
