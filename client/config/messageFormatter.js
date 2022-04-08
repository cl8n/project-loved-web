const { interpolateName } = require('@formatjs/ts-transformer');

function format(msgs) {
  const results = {};

  for (const [, msg] of Object.entries(msgs)) {
    const category = msg.description.match(/^\[([^\]]+)\]/)?.[1];
    const description = msg.description.replace(/^\[[^\]]+\]\s*/, '');
    const id = interpolateName({}, '[sha512:contenthash:base64:6]', {
      content: `${msg.defaultMessage}#${description}`,
    });

    results[id] = {
      category,
      defaultMessage: msg.defaultMessage,
      description,
    };
  }

  return results;
}

module.exports = {
  format,
};
