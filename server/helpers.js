function accessNested(object, key) {
  const keyParts = key.split('.');
  let value = object;

  while (value != null && keyParts.length > 0) {
    value = value[keyParts.shift()];
  }

  return value;
}

function groupBy(array, key, dataKey, keyIsUnique = false, nullKeyGroup = 'null') {
  return array.reduce((prev, value) => {
    const groupKey = accessNested(value, key) ?? nullKeyGroup;

    if (prev[groupKey] == null) {
      prev[groupKey] = [];
    }

    prev[groupKey].push(dataKey == null ? value : accessNested(value, dataKey));

    if (keyIsUnique) {
      prev[groupKey] = prev[groupKey][0];
    }

    return prev;
  }, {});
}

function modeBy(array, key) {
  const counts = { 0: 0 };
  let mode = 0;

  for (const { [key]: value } of array) {
    const count = counts[value] == null ? (counts[value] = 1) : ++counts[value];

    if (count > counts[mode]) {
      mode = value;
    }
  }

  return mode;
}

module.exports = {
  accessNested,
  groupBy,
  modeBy,
};
