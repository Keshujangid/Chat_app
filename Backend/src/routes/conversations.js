const express = require("express");
const auth = require("../middleware/auth");
const convoSvc = require("../services/conversationService");
const msgSvc = require("../services/messageService");
const { startDmSchema } = require("../validators/conversation");
const { sendMessageSchema } = require("../validators/message");
const prisma = require("../prisma/client");

const router = express.Router();

// All routes require JWT
router.use(auth);

/* GET /api/conversations  -> list for sidebar */
router.get("/", async (req, res, next) => {
  try {
    const list = await convoSvc.listForUser(req.user.id);
    // console.log(list)
    res.json(list);
  } catch (err) { next(err); }
});

/* POST /api/conversations/${recipientId}  -> create/fetch a 1-to-1 */
router.get("/:chatId", async (req, res, next) => {
  try {
    // console.log("Starting DM with:", req.params.recipientId);
    const { chatId } = req.params;
    // console.log("chatId:", chatId)
    const convo = await convoSvc.getConversationById(chatId, req.user.id);
    res.status(201).json(convo);
  } catch (err) { next(err); }
});


/* GET /api/conversations/:id/messages?cursor=<id>&limit=20 */
router.get("/:id/messages", async (req, res, next) => {
  const { id: conversationId } = req.params;
  const { cursor } = req.query; // The ID of the last message seen
  const { id: userId } = req.user;
  const limit = 20; // Number of messages to fetch per request

  try {
    // --- Authorization: Ensure user is part of the conversation ---
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!participant) {
      return res.status(403).json({ message: 'You are not a member of this conversation.' });
    }
    const messages = await msgSvc.fetchPaginated(conversationId, limit, cursor);
    const nextCursor = messages.length === limit ? messages[limit - 1].id : null;
    messages.reverse();
    res.status(200).json({
      messages,
      nextCursor,
    });
  } catch (err) { next(err); }
});

/* POST /api/conversations/:id/messages  (fallback REST send) */
router.post("/:id/messages", async (req, res, next) => {
  try {

    // console.log(req.body)

    const { conversationId } = req.body
    const { text, imageUrl } = sendMessageSchema.parse(req.body);
    const message = await msgSvc.saveMessage({
      conversationId,
      senderId: req.user.id,
      text, imageUrl
    });
    // Emit via Socket.IO so connected clients get it in real-time
    req.app.get("io")
      .to(`convo:${conversationId}`)
      .emit("message:new", message);

    res.status(201).json(message);
  } catch (err) { next(err); }
});


router.post("/group", async (req, res) => {
  const { name, participantIds } = req.body;
  const { id: creatorId } = req.user; // Get the creator's ID from auth middleware

  // 1. --- Input Validation ---
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Group name is required.' });
  }

  if (!participantIds || !Array.isArray(participantIds) || participantIds.length < 2) {
    return res.status(400).json({ message: 'At least two other participants are required for a group.' });
  }

  // Ensure the creator is not accidentally included in the participant list from the client
  const finalParticipantIds = [creatorId, ...participantIds.filter(id => id !== creatorId)];

  if (finalParticipantIds.length < 3) {
    return res.status(400).json({ message: 'A group must have at least 3 total members.' });
  }

  try {
    // 2. --- Database Operation ---
    const newGroup = await prisma.conversation.create({
      data: {
        title: name,
        isGroup: true,
        createdBy: creatorId,
        // Create the conversation and connect all participants in one transaction
        participants: {
          create: finalParticipantIds.map(userId => ({
            userId: userId,
            // Assign role: The creator is the owner (2), others are members (0)
            role: userId === creatorId ? 2 : 0,
          })),
        },
      },
      // 3. --- Select Data to Return ---
      // Return the newly created group with all its members' details
      select: {
        id: true,
        title: true,
        isGroup: true,
        createdAt: true,
        participants: {
          select: {
            role: true,
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Optional: You could emit a socket event here to notify all participants
    // that they've been added to a new group.
    // finalParticipantIds.forEach(userId => {
    //   io.to(userId).emit('group:new', newGroup);
    // });

    res.status(201).json(newGroup);
  } catch (error) {
    // console.error('Failed to create group:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
})





module.exports = router;