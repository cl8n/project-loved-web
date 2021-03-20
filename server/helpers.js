function groupBy(array, key, dataKey) {
  return array.reduce((prev, value) => {
    if (prev[value[key]] == null)
      prev[value[key]] = [];

    prev[value[key]].push(dataKey == null ? value : value[dataKey]);

    return prev;
  }, {});
}

module.exports = {
  groupBy,
};
