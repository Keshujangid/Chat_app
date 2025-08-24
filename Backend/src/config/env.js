// src/config/env.js
require("dotenv").config();

module.exports = {
  NODE_ENV   : process.env.NODE_ENV || "development",
  PORT       : process.env.PORT     || 5000,
  CLIENT_URL : process.env.CLIENT_URL || "http://localhost:5173",
  JWT_SECRET : process.env.JWT_SECRET || "secrate",
};