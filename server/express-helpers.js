function asyncHandler(handler) {
  return function (...args) {
    const handlerReturn = handler(...args);
    const next = args[args.length - 1];

    return Promise.resolve(handlerReturn).catch(next);
  };
}

module.exports = {
  asyncHandler,
};
