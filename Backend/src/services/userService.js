const prisma = require("../prisma/client");
const { hashPassword, comparePassword } = require("../utils/hash");

exports.createUser = async ({ username, email, password }) => {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { username, email, passwordHash }
  });
};

exports.findByEmail = (email) =>
  prisma.user.findUnique({ where: { email } });

exports.findByUsername = (username)=>{
  prisma.user.findUnique({where:{username}})
}


exports.validatePassword = (plain, hash) =>
  comparePassword(plain, hash);