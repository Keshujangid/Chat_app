const express = require("express");
const auth = require("../middleware/auth");
const prisma = require("../prisma/client");
const { profileSchema } = require("../validators/profile")
const userService = require("../services/userService");
const router = express.Router();
const uploadAvatar = require("../middleware/uploadAvatar")


router.use(auth)

// GET /api/users/me
router.get("/me", async (req, res, next) => {
  try {
    // console.log('running');
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, avatarUrl: true, bio: true, createdAt: true }
    });
    res.json(user);
  } catch (err) { next(err); }
});

router.put("/me", async (req, res, next) => {
  try {
    const { username, bio } = profileSchema.parse(req.body);

    const userId = req.user.id;
    const result = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        username,
        bio,
      },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    res.json(result);
  } catch (error) {
    // console.log(error)
    next(error);
  }
}
)

router.put("/me/avatar", uploadAvatar.single("avatar"),      // field name 'avatar'
  async (req, res, next) => {
    try {
      // Cloudinary URL available at req.file.path
      const url = req.file.path;          // disk variant: `/uploads/avatars/...`
      await prisma.user.update({
        where: { id: req.user.id },
        data: { avatarUrl: url },
      });
      res.json({ avatarUrl: url });
    } catch (err) { next(err); }
  })



router.get('/', // Route handler for finding users, optimized with UserFriend model
async (req, res) => {
  const { id: currentUserId } = req.user;
  const { q: searchQuery } = req.query;

  try {
    // 1. --- Define the main query condition ---
    const whereCondition = {
      id: { not: currentUserId },
    };
    if (searchQuery) {
      whereCondition.username = {
        contains: searchQuery,
        mode: 'insensitive',
      };
    }

    // 2. --- Fetch users with optimized relational data ---
    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        isOnline: true,

        // A. EFFICIENTLY check if they are already friends using the new model
        userFriends: {
          where: { friendId: currentUserId },
          select: { userId: true }, // Select minimal data, we just need to know if it exists
        },

        // B. Check for a PENDING request sent BY ME to THEM
        receivedFriendships: {
          where: { requesterId: currentUserId, status: 'PENDING' },
          select: { status: true },
        },
        
        // C. Check for a PENDING request sent BY THEM to ME
        requestedFriendships: {
          where: { addresseeId: currentUserId, status: 'PENDING' },
          select: { status: true },
        },
      },
      take: 20,
    });

    // 3. --- Transform the data for a clean API response ---
    const usersWithStatus = users.map((user) => {
      const { userFriends, receivedFriendships, requestedFriendships, ...restOfUser } = user;

      let friendshipStatus = 'NOT_FRIENDS';

      if (userFriends.length > 0) {
        // The 'friends' array has an item, so we are friends.
        friendshipStatus = 'FRIENDS';
      } else if (receivedFriendships.length > 0) {
        // I sent them a request that is pending
        friendshipStatus = 'PENDING_SENT';
      } else if (requestedFriendships.length > 0) {
        // They sent me a request that is pending
        friendshipStatus = 'PENDING_RECEIVED';
      }

      return {
        ...restOfUser,
        friendshipStatus: friendshipStatus,
      };
    });

    res.status(200).json(usersWithStatus);

  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


module.exports = router;