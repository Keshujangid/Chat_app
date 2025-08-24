const jwt  = require("jsonwebtoken");
const env  = require("../config/env");

const EXPIRES_IN = "1d";

exports.signToken = (payload) =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN });

exports.verifyToken = (token) => jwt.verify(token, env.JWT_SECRET);

