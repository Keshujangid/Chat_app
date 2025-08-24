const prisma = require("../prisma/client");

/**
 * Creates a new friend request.
 * Expects the ID of the recipient in the request body.
 */
exports.sendFriendRequest = async (req, res) => {

  const { id: requesterId } = req.user; // The person sending the request
  const { addresseeId } = req.body; // The person to receive the request
  // 1. --- Basic Validation ---
  if (!addresseeId) {
    return res.status(400).json({ message: 'Recipient ID is required.' });
  }

  if (requesterId === addresseeId) {
    return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
  }

  try {
    // 2. --- Check for any existing relationship (in either direction) ---
    // This prevents sending a request if you are already friends or if a request is already pending.
    const existingRelationship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: requesterId, addresseeId: addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existingRelationship) {
      if (existingRelationship.status === 'ACCEPTED') {
        return res.status(409).json({ message: 'You are already friends with this user.' }); // 409 Conflict
      }
      if (existingRelationship.status === 'PENDING') {
        return res.status(409).json({ message: 'A friend request is already pending between you and this user.' });
      }
    }

    // 3. --- Create the new friend request ---
    // If no relationship exists, we can safely create a new one.
    const newRequest = await prisma.friendship.create({
      data: {
        requesterId: requesterId,
        addresseeId: addresseeId,
        // Status defaults to PENDING as per your schema, but it's good practice to be explicit.
        status: 'PENDING',
      },
    });

    // 4. --- Send Success Response ---
    res.status(201).json({
      message: 'Friend request sent successfully.',
      friendship: newRequest,
    });

  } catch (error) {
    // Handle potential errors, e.g., if the addresseeId does not exist (Prisma will throw an error).
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};




exports.acceptFriendRequest = async (requesterId, addresseeId) => {
  return prisma.$transaction(async (tx) => {
    // 1. Update the original friendship request to ACCEPTED
    const updatedFriendship = await tx.friendship.update({
      where: {
        requesterId_addresseeId: {
          requesterId: requesterId,
          addresseeId: addresseeId,
        },
      },
      data: {
        status: 'ACCEPTED',
      },
    });

    // 2. Create the bidirectional friendship records for fast lookups
    await tx.userFriend.createMany({
      data: [
        { userId: requesterId, friendId: addresseeId },
        { userId: addresseeId, friendId: requesterId },
      ],
      skipDuplicates: true, // Prevents errors if the relationship already exists
    });
    //3. Create new conversation on req accept
    const newConversation = await tx.conversation.create({
      data: {
        isGroup: false,
        createdBy: addresseeId, // The user who accepted the request "creates" the convo.
        // Use a nested write to create the participant records at the same time.
        participants: {
          create: [
            { userId: requesterId },
            { userId: addresseeId },
          ],
        },
      },
      // Include the participants in the return value for immediate use.
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true }}
          }
        }
      }
    });

    // console.log("here",updatedFriendship)
    return {updatedFriendship, newConversation};
  });
};

/**
 * Removes a friendship and deletes the corresponding entries from the UserFriend table.
 * @param {string} userId1 - The ID of the first user.
 * @param {string} userId2 - The ID of the second user.
 */
exports.removeFriendship = async (userId1, userId2) => {
  return prisma.$transaction(async (tx) => {
    // 1. Delete the original Friendship record, regardless of who was the requester
    await tx.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: userId1, addresseeId: userId2 },
          { requesterId: userId2, addresseeId: userId1 },
        ],
      },
    });

    // 2. Delete the bidirectional UserFriend records
    await tx.userFriend.deleteMany({
      where: {
        OR: [
          { userId: userId1, friendId: userId2 },
          { userId: userId2, friendId: userId1 },
        ],
      },
    });
  });
};