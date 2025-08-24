// routes/friendshipRoutes.js

const express = require('express');
const { PrismaClient, FriendshipStatus } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const auth = require("../middleware/auth");
const friendshipService = require("../services/friendshipService")
// Assume auth middleware `protect` is used to get req.user.id
// Example: const { protect } = require('../middleware/authMiddleware');
// router.use(protect);

router.use(auth);


/*
 * @route   POST /api/friendships
 * @desc    Send a friend request to another user
 * @access  Private
 * @body    { "addresseeId": "user-id-to-friend" }
 */
router.post('/', friendshipService.sendFriendRequest);


/*
 * @route   GET /api/friendship
 * @desc    Get all of the current user's friendships (pending, accepted, etc.)
 * @access  Private
 */
router.get('/', async (req, res) => {
  const { id: userId } = req.user;

  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId },
          { addresseeId: userId }
        ],
      },
      include: {
        requester: { select: { id: true, username: true, avatarUrl: true, isOnline: true } },
        addressee: { select: { id: true, username: true, avatarUrl: true, isOnline: true } },
      },
    });

    // Categorize for easier frontend consumption
    const categorized = {
      accepted: friendships.filter(f => f.status === FriendshipStatus.ACCEPTED),
      incomingRequests: friendships.filter(f => f.status === FriendshipStatus.PENDING && f.addresseeId === userId),
      outgoingRequests: friendships.filter(f => f.status === FriendshipStatus.PENDING && f.requesterId === userId),
    };

    res.status(200).json(categorized);
  } catch (error) {
    // console.error('Failed to get friendships:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});


/*
 * @route   PUT /api/friendships/:id
 * @desc    Accept or block a friend request
 * @access  Private
 * @body    { "status": "ACCEPTED" | "BLOCKED" }
 */
router.put('/', async (req, res) => {
  
  const { requesterId } = req.body;
  // The person ACCEPTING the request is the currently logged-in user.
  const { id: currentUserId } = req.user;

  // 1. --- Validation ---
  if (!requesterId) {
    return res.status(400).json({ message: 'Requester ID is required.' });
  }

  try {
    // Call the service with the secure IDs.
    const result = await friendshipService.acceptFriendRequest(requesterId, currentUserId);

    res.status(200).json({
      message: "Friend request accepted and conversation created successfully.",
      ...result
    });

  } catch (error) {
    // Prisma's error code for "record to update not found" is P2025.
    // This happens if the request was already accepted, declined, or never existed.
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Friend request not found or has already been handled.' });
    }

    // console.error(`Failed to accept friendship:`, error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});


/*
 * @route   DELETE /api/friendships/:id
 * @desc    Cancel a sent request, or remove a friend
 * @access  Private
 */
router.delete('/:requesterId/:addresseeId', async (req, res) => {

  // console.log(req.body)

  const { requesterId, addresseeId } = req.params;
  const { id: currentUserId } = req.user;

  try {
    const friendship = await prisma.friendship.findUnique({
      where: {
        requesterId_addresseeId: {  // Use the composite key syntax
          requesterId,
          addresseeId
        }
      }
    });

    // --- Authorization: Ensure the user is part of this friendship ---
    if (!friendship || (friendship.requesterId !== currentUserId && friendship.addresseeId !== currentUserId)) {
      return res.status(404).json({ message: 'Friendship not found or you are not part of it.' });
    }

    await prisma.friendship.delete({
      where: {
        requesterId_addresseeId: {  // Use the composite key syntax
          requesterId,
          addresseeId
        }
      },
    });

    // Optional: Notify the other user that the friendship has been removed
    // const otherUserId = friendship.requesterId === currentUserId ? friendship.addresseeId : friendship.requesterId;
    // io.to(otherUserId).emit('friendship:removed', { friendshipId });

    res.status(204).send(); // 204 No Content is standard for successful deletions
  } catch (error) {
    console.error(`Failed to delete friendship ${friendshipId}:`, error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});








module.exports = router;

