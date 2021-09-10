const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { join, isAbsolute, normalize } = require('path');
const { accessNested } = require('./helpers');

if (!isAbsolute(process.env.STORAGE_PATH ?? '')) {
  throw 'Invalid storage path';
}

const storagePath = normalize(process.env.STORAGE_PATH);
const settingsPath = join(storagePath, 'settings.json');

if (!existsSync(storagePath)) {
  mkdirSync(storagePath);
}

const settings = existsSync(settingsPath)
  ? JSON.parse(readFileSync(settingsPath, 'utf8'))
  : (writeFileSync(settingsPath, '{}'), {});

function updateSettingInternal(key, value) {
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

  modifyingScope[keyParts[keyParts.length - 1]] = value;
}

function writeSettings() {
  writeFileSync(settingsPath, JSON.stringify(settings));
}

function accessSetting(key) {
  return accessNested(settings, key);
}

function updateSetting(key, value) {
  updateSettingInternal(key, value);
  writeSettings();
}

function updateSettings(newSettings) {
  for (const [key, value] of Object.entries(newSettings)) {
    updateSettingInternal(key, value);
  }

  writeSettings();
}

module.exports = {
  accessSetting,
  settings,
  updateSetting,
  updateSettings,
};
