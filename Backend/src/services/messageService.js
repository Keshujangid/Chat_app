const prisma = require("../prisma/client");

async function saveMessage({ conversationId, senderId, text, attachments }) {
  const newMessage = await prisma.$transaction(async (tx) => {
    // Step 1: Create the Message and its related Attachments
    const createdMessage = await tx.message.create({
      data: {
        conversationId,
        senderId,
        text: text || null, // Ensure text is null if empty
        messageType: attachments && attachments.length > 0 ? "FILE" : "TEXT",
        // Prisma's nested write: create attachments at the same time
        Attachment: {
          create: attachments?.map((file) => ({
            url: file.url,
            name: file.name,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            type: file.type,
          })),
        },
      },
      // Include all relations needed for the frontend
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
        Attachment: true, // Include the newly created attachments
      },
    });

    // Step 2: Update the parent Conversation
    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: createdMessage.createdAt,
        lastMessageId: createdMessage.id, // Link the conversation to this new message
      },
    });

    return createdMessage;
  });

  return newMessage;
}
async function fetchPaginated(conversationId, limit, cursor) {
  const messages = await prisma.message.findMany({
    take: limit,
    // If a cursor is provided, skip the cursor itself
    skip: cursor ? 1 : 0,
    // Use the cursor to start fetching from that specific message
    cursor: cursor ? { id: cursor } : undefined,
    where: {
      conversationId: conversationId,
    },
    orderBy: {
      createdAt: 'desc', // Fetch latest messages first
    },
    select: {
      id: true,
      text: true,
      createdAt: true,
      sender: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      Attachment: {
        select: {
          id: true,
          name: true,
          url: true,
          type: true,
          fileSize:true
        }
      }
    },
  });
  return messages;
};


module.exports = { saveMessage, fetchPaginated }