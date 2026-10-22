/**
 * Wraps async route handlers to automatically catch errors and forward them to Express next().
 * @param {Function} fn - Async controller function (req, res, next)
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
