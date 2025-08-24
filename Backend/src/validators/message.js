// validators/message.js
const { z } = require("zod");

// A schema for a single attachment object
const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int(),
  type: z.enum(["IMAGE", "VIDEO", "AUDIO", "FILE"]), // From your schema enum
});

// Update the main message schema to accept an array of attachments
const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  text: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(), // Can be an array of files
});

module.exports = { sendMessageSchema };

exports.typingSchema = z.object({
  conversationId: z.string().uuid()
});