const { verifyToken } = require("../utils/token");

module.exports = function authGuard(req, res, next) {
  const auth = req.headers.authorization;            // "Bearer <token>"
  if (!auth) return res.status(401).json({ error: "No token" });

  const [, token] = auth.split(" ");
  try {
    const payload = verifyToken(token);
    // console.log('payload', payload);
    req.user = payload;                               // { id, username, email }
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};