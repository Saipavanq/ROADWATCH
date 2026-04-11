const mcache = require('memory-cache');

const cache = (durationMinutes) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = mcache.get(key);
    if (cachedBody) {
      return res.json(JSON.parse(cachedBody));
    } else {
      res.sendResponse = res.json;
      res.json = (body) => {
        mcache.put(key, JSON.stringify(body), durationMinutes * 60 * 1000);
        res.sendResponse(body);
      };
      next();
    }
  };
};

module.exports = cache;
