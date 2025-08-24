const { z } = require("zod");

exports.profileSchema = z.object({
    username: z.string().min(3, { error: "Username must be at least 3 char long" }).max(32, { error: "Username must be less than 32 char" }),
    email: z.string().email(),
    bio: z.string().max(50, { error: "Bio must be less than 50 characters long" }).nullable()
})