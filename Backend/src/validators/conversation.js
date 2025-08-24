const { z } = require("zod");

exports.startDmSchema = z.object({
  recipientId: z.string().describe("The ID of the user to start a DM with")
});

exports.groupCreateSchema = z.object({
  title:  z.string().min(1).max(100),
  users:  z.array(z.string().uuid()).min(2)  // at least 2 + creator ⇒ 3+
});