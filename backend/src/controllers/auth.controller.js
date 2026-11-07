// Register / login / logout / me. Passwords are bcrypt-hashed (cost 12); the
// session token lives in an HttpOnly, HMAC-signed cookie.
const bcrypt = require("bcrypt");
const prisma = require("../prisma/client");
const config = require("../config");
const { createSession, deleteSession, SESSION_TTL_MS } = require("../auth/session");
const { signCookie, verifyCookie } = require("../auth/crypto");
const { SESSION_COOKIE } = require("../middleware/auth.guard");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// A real hash so login timing is identical whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync("zenoryx-timing-guard", 12);

function cookieOptions() {
  const crossSite = config.cookieCrossSite;
  return {
    httpOnly: true,
    secure: config.isProd || crossSite,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
  };
}

function setSessionCookie(res, rawToken) {
  res.cookie(SESSION_COOKIE, signCookie(rawToken), { ...cookieOptions(), maxAge: SESSION_TTL_MS });
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.createdAt });

async function register(req, res) {
  const { email, password, name } = req.body || {};
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanName = typeof name === "string" ? name.trim() : "";

  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    return res.status(400).json({ error: "Please provide a valid email address.", field: "email" });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Password must be 8–128 characters.", field: "password" });
  }
  if (cleanName.length < 2 || cleanName.length > 60) {
    return res.status(400).json({ error: "Name must be 2–60 characters.", field: "name" });
  }

  try {
    const user = await prisma.user.create({
      data: { email: cleanEmail, password: await bcrypt.hash(password, 12), name: cleanName },
    });
    setSessionCookie(res, await createSession(user.id, req.headers["user-agent"]));
    return res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "An account with this email already exists.", field: "email" });
    }
    throw err;
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  const valid = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  setSessionCookie(res, await createSession(user.id, req.headers["user-agent"]));
  return res.status(200).json({ user: publicUser(user) });
}

async function logout(req, res) {
  const rawToken = verifyCookie(req.cookies?.[SESSION_COOKIE]);
  if (rawToken) await deleteSession(rawToken);
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  return res.status(200).json({ ok: true });
}

function me(req, res) {
  return res.status(200).json({ user: req.user });
}

/** Soft check for public pages: 200 with { user: null } instead of a 401. */
async function session(req, res) {
  res.set("Cache-Control", "no-store");
  const rawToken = verifyCookie(req.cookies?.[SESSION_COOKIE]);
  if (!rawToken) return res.json({ user: null });
  const s = await prisma.session.findUnique({
    where: { sessionToken: rawToken },
    include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
  });
  return res.json({ user: s && s.expiresAt > new Date() ? s.user : null });
}

module.exports = { register, login, logout, me, session };
