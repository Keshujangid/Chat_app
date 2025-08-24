const { sendMessageSchema } = require("../validators/message");
const msgSvc = require("../services/messageService");
const prisma = require("../prisma/client"); // Import prisma once at the top
// In-memory map to track connection counts for each user { userId -> socketCount }
const activeUsers = new Map();

/*
 * Updates the user's online status in the database.
 * @param {string} userId - The ID of the user.
 * @param {boolean} isOnline - The new online status.
 */
async function updateUserOnlineStatus(userId, isOnline) {
  try {
    // Only update lastSeen when the user goes offline.
    const data = isOnline ? { isOnline: true } : { isOnline: false, lastSeen: new Date() };

    await prisma.user.update({
      where: { id: userId },
      data: data,
    });
    // console.log(`Database: User ${userId} isOnline set to ${isOnline}`);
  } catch (error) {
    console.error(`Database Error: Failed to update status for user ${userId}:`, error);
  }
}

module.exports = function (io, socket) {
  const userId = socket.user.id;

  // console.log(`User connected: ${userId} with socket ID: ${socket.id}`);

  // --- PRESENCE: ON CONNECTION ---
  const isFirstConnection = !activeUsers.has(userId);
  activeUsers.set(userId, (activeUsers.get(userId) || 0) + 1);

  if (isFirstConnection) {
    // This is the user's first tab/connection. Update DB and notify everyone.
    updateUserOnlineStatus(userId, true);
    socket.broadcast.emit("user:online", { userId }); // Use broadcast to avoid sending to the user who just connected
    // console.log(`User ${userId} is now online.`);
  }

  // --- INITIAL STATE FOR NEW CONNECTION ---
  // Send the list of all currently online users to the newly connected client.
  const currentOnlineUsers = Array.from(activeUsers.keys());
  socket.emit("users:online", currentOnlineUsers);

  // --- CONVERSATION & MESSAGE HANDLERS (Unchanged) ---

  /* Join a conversation room */
  socket.on("conversation:join", (conversationId) => {
    socket.join(`convo:${conversationId}`);
    socket.to(`convo:${conversationId}`).emit("user:joined", { userId, conversationId });

    // Send current online users for this conversation
    const onlineUsersInConversation = getOnlineUsersForConversation(conversationId);
    socket.emit("conversation:online-users", {
      conversationId,
      onlineUsers: onlineUsersInConversation
    });
  });


  // Add this handler for requesting online users
  socket.on("conversation:request-online-users", ({ conversationId }) => {
    const onlineUsersInConversation = getOnlineUsersForConversation(conversationId);
    socket.emit("conversation:online-users", {
      conversationId,
      onlineUsers: onlineUsersInConversation
    });
  });

  /* Leave a conversation room */
  socket.on("conversation:leave", (conversationId) => {
    // console.log(`User ${userId} left conversation ${conversationId}`);
    socket.leave(`convo:${conversationId}`);
    socket.to(`convo:${conversationId}`).emit("user:left", { userId, conversationId });
  });

  /* Send message via socket */
socket.on("message:send", async (payload, cb) => {
  try {
    // The validator now correctly parses the attachments array
    const data = sendMessageSchema.parse(payload);
    // console.log(data)
    const message = await msgSvc.saveMessage({
      conversationId: data.conversationId,
      senderId: userId,
      text: data.text,
      attachments: data.attachments, // <-- Pass the full attachments array
    });

    // Broadcast the complete message object, which now includes the attachments
    socket.to(`convo:${data.conversationId}`).emit("message:new", message);

    cb?.({ status: "ok", message: message });
  } catch (err) {
    console.error("Error sending message:", err);
    cb?.({ status: "error", message: err.message });
  }
});

  /* Handle typing indicator */
  socket.on("user:typing", (payload) => {
    const { conversationId } = payload;
    // console.log("running", conversationId)


    socket.to(`convo:${conversationId}`).emit("user:typing", { userId, conversationId });
  });

  /* Handle stop typing */
  socket.on("user:stop-typing", (payload) => {
    const { conversationId } = payload;
    socket.to(`convo:${conversationId}`).emit("user:stop-typing", { userId, conversationId });
  });


  // --- PRESENCE: ON DISCONNECT ---
  socket.on("disconnect", (reason) => {
    // console.log(`User ${userId} disconnected. Reason: ${reason}`);
    const connectionCount = (activeUsers.get(userId) || 1) - 1;

    if (connectionCount <= 0) {
      // This was the user's last tab/connection. Update DB and notify everyone.
      activeUsers.delete(userId);
      updateUserOnlineStatus(userId, false);
      io.emit("user:offline", { userId, lastSeen: new Date() }); // Use io.emit to inform all clients
      // console.log(`User ${userId} is now offline.`);
    } else {
      activeUsers.set(userId, connectionCount);
    }
  });


  // --- ERROR HANDLER ---
  socket.on("error", (error) => {
    console.error(`Socket error for user ${userId}:`, error);
  });
};

function getOnlineUsersForConversation(conversationId) {
  // You'll need to implement this based on your conversation participants
  // For now, return all online users
  return Array.from(activeUsers.keys());
}

// --- HELPER EXPORTS (Unchanged) ---
module.exports.getActiveUsers = () => Array.from(activeUsers.keys());
module.exports.getActiveUserCount = () => activeUsers.size;

