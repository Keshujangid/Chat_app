const { z } = require("zod");

exports.registerSchema = z.object({
  username: z.string({error:'Username must be String'}).min(3,{error:"Username must be at least 3 char long"}).max(32,{error:"Username must be less than 32 char"}),
  email:    z.email(),
  password: z.string().min(6).max(100)
});

exports.loginSchema = z.object({
  email:    z.email(),
  password: z.string().min(6,{error:"password must be at least 6 character long"}).max(100)
});