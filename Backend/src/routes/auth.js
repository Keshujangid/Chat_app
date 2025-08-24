const express = require("express");
const { registerSchema, loginSchema } = require("../validators/auth");
const userService = require("../services/userService");
const { signToken } = require("../utils/token");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    console.log("Registering user:", req.body);
    const data = registerSchema.parse(req.body);

    // duplicate check
    const exists = await userService.findByEmail(data.email);
    if (exists) return res.status(409).json({ error: "Email already in use" });

    const user = await userService.createUser(data);
    const token = signToken({ id: user.id, username: user.username, email: user.email });

    return res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    // console.error('here', err);
    if (err.name === "ZodError") return res.status(400).json({ error: err.issues[0]?.message });
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
	
    const user = await userService.findByEmail(email);
    if (!user) return res.status(401).json({ error: "No user found!" });

    const ok = await userService.validatePassword(password, user.passwordHash);
    if (!ok)   return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ id: user.id, username: user.username, email: user.email });
    return res.json({ token, user:{id:user.id , name:user.username} });
  } catch (err) {
    if (err.name === "ZodError") return res.status(400).json({ error: err.issues[0]?.message });
    next(err);
  }
});




module.exports = router;
