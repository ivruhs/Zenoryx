/*

src/controllers/auth.controller.js: The business logic. It handles hashing passwords with bcrypt, validating credentials, throwing 409 errors for duplicate emails, and telling Express to set or clear the HttpOnly cookie. It also has register, login, and logout functions that call the session manager and crypto engine.

*/

const bcrypt = require("bcrypt");
const prisma = require("../prisma/client");
const { createSession, deleteSession } = require("../auth/session");
const { signCookie } = require("../auth/crypto");
const config = require("../config");

// helper to set session cookie
const setSessionCookie = (res, rawToken) => {
  const signedToken = signCookie(rawToken);
  res.cookie("session", signedToken, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: config.env === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ error: "Email, password, and name are required." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
      },
    });

    // create session and set cookie
    const userAgent = req.headers["user-agent"] || "Unknown";
    const rawToken = await createSession(user.id, userAgent);
    setSessionCookie(res, rawToken);

    res
      .status(201)
      .json({ message: "User registered successfully.", userId: user.id });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Email already in use." });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." }); // Do not reveal email existence
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // create session and set cookie
    const userAgent = req.headers["user-agent"] || "Unknown";
    const rawToken = await createSession(user.id, userAgent);
    setSessionCookie(res, rawToken);

    return res
      .status(200)
      .json({ message: "Logged in successfully.", userId: user.id });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const signedCookie = req.cookies["session"];
    if (signedCookie) {
      const rawToken = signedCookie.split(".")[0]; // extract raw token from signed cookie
      if (rawToken) {
        await deleteSession(rawToken);
      }
    }
    res.clearCookie("session", {
      httpOnly: true,
      secure: config.env === "production",
      sameSite: config.env === "production" ? "none" : "lax",
    });
    return res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
};
