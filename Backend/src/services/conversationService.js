const prisma = require("../prisma/client");

// Helper to ensure deterministic 1-to-1 uniqueness


// --- Data Selection Constant ---
const selectDmData = {
  id: true,
  isGroup: true,
  participants: {
    select: {
      user: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          isOnline: true,
          lastSeen: true,
        },
      },
    },
  },
};


const selectRecipientData = {
  user: {
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      isOnline: true,
      lastSeen: true,
    },
  },
};

/* Fetch a direct (1-to-1) conversation */
exports.getConversationById = async (conversationId, currentUserId) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        isGroup: true,
        avatarUrl:true,
        title:true,
        // Select and filter the participants list at the database level
        participants: {
          where: {
            // IMPORTANT: Only include participants whose userId is NOT the current user's ID
            userId: {
              not: currentUserId,
            },
          },
          select: selectRecipientData,
        },
      },
    });

    // If no conversation or participants are found (e.g., bad ID), return null.
    if (!conversation) {
      return null;
    }

    if (conversation.isGroup) {
      return conversation
    }

    // console.log(conversation)

    // --- Application-Level Formatting ---
    // The database query gives us an array of participants (which will have 1 item for a DM).
    // We can now format this into a cleaner "recipient" object.

    const formattedConversation = {
      id: conversation.id,
      isGroup: conversation.isGroup,
      // Take the first (and only) participant from the filtered list
      recipient: conversation.participants[0]?.user || null,
    };

    // console.log(formattedConversation)
    return formattedConversation;

  } catch (error) {
    console.error(`Failed to get conversation ${conversationId} for user ${currentUserId}:`, error);
    throw new Error('An error occurred while fetching the conversation.');
  }
}

async function createDm(creatorId, recipientId) {
  // 1. Prevent creating a DM with oneself
  if (creatorId === recipientId) {
    throw new Error('Cannot create a conversation with yourself.');
  }

  // 2. Check if a conversation already exists to prevent duplicates
  const existingConversation = await getDm(creatorId, recipientId);
  if (existingConversation) {
    // Depending on your API design, you might want to return the existing
    // conversation instead of throwing an error. Throwing is clearer for a dedicated "create" function.
    throw new Error('A conversation between these users already exists.');
  }

  // 3. Create the new conversation
  try {
    const newConversation = await prisma.conversation.create({
      data: {
        createdBy: creatorId,
        isGroup: false,
        // Create participant entries for both users
        participants: {
          create: [{ userId: creatorId }, { userId: recipientId }],
        },
      },
      select: selectDmData,
    });
    return newConversation;
  } catch (error) {
    console.error('Failed to create DM:', error);
    throw new Error('An error occurred while creating the conversation.');
  }
}




/**
 * Lists conversations for the sidebar.
 * This version is optimized to use a UserFriend lookup table and excludes unread counts.
 */
exports.listForUser = async (userId) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      // The user must be a participant in any conversation returned.
      participants: {
        some: {
          userId: userId,
        },
      },
      // AND the conversation must be a group chat OR a 1-on-1 with a friend.
      OR: [
        // 1. It is a group conversation.
        {
          isGroup: true,
        },
        // 2. It is a 1-on-1 chat where the other participant is a friend.
        {
          isGroup: false,
          // Check that the *other* participant exists in the user's friend list.
          participants: {
            some: {
              // The other participant's ID...
              userId: {
                not: userId,
              },
              // ...must have a corresponding entry in the UserFriend table.
              // This is much faster than the previous multi-level check.
              user: {
                userFriends: {
                  some: {
                    friendId: userId,
                  },
                },
              },
            },
          },
        },
      ],
    },
    include: {
      // Include participants and their user data to display names/avatars.
      participants: {
        include: {
          user: {
            select: { // Select only the fields you need for the sidebar.
              id: true,
              username: true,
              avatarUrl: true,
              isOnline: true
            }
          },
        },
      },
      // Include the last message to show a preview.
      lastMessage: {
        include: {
          sender: {
            select: {
              id: true,
              username: true,
            }
          },
        },
      },
    },
    orderBy: {
      // Sort by the most recent message. Make sure lastMessageAt is indexed.
      lastMessageAt: 'desc',
    },
  });

  if (!conversations || conversations.length === 0) {
    return [];
  }

  // The transformConversations function can now be simplified as it
  // no longer needs to handle the _count object.
  return transformConversations(conversations, userId);
};

function transformConversations(conversations, currentUserId) {
  return conversations.map(conversation => {
    let name;
    let avatar;
    let isOnline;
    let userId = null;

    if (conversation.isGroup) {
      // For group conversations
      name = conversation.title || 'Group Chat';
      avatar = conversation.avatarUrl || '/placeholder.svg?height=40&width=40';
      // Check if any participant (except current user) is online
      isOnline = conversation.participants.some(
        (p) => p.userId !== currentUserId && p.user.isOnline
      );
    } else {
      // For direct conversations - find the other person
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== currentUserId
      );

      name = otherParticipant?.user.username || 'Unknown User';
      userId = otherParticipant?.userId;
      avatar = otherParticipant?.user.avatarUrl || '/placeholder.svg?height=40&width=40';
      isOnline = otherParticipant?.user.isOnline || false;
    }
    // console.log("here",conversation)
    return {
      id: conversation.id,
      name,
      userId,
      avatar,
      isOnline,
      isGroup: conversation.isGroup,
      lastMessage: conversation.lastMessage?.text || 'No messages yet',
      timestamp: conversation.lastMessageAt
        ? formatTimestamp(conversation.lastMessageAt)
        : '',
      // unread: conversation._count.messages
    };
  });
}

function formatTimestamp(date) {
  const now = new Date();
  const messageDate = new Date(date);
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return messageDate.toLocaleDateString();
  }
}
