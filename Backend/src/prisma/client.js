// Thin wrapper so we import one singleton everywhere
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;