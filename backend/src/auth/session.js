/*

src/auth/session.js: The database manager. It generates 48-byte secure random strings, saves them to the PostgreSQL Session table with a 7-day expiry, and deletes them during logout.

*/

const crypto = require("crypto");
const prisma = require("../prisma/client");

// create a new session in database for user
async function createSession(userId, userAgent = "Unknown") {
  // db function therefore it is async
  const rawToken = crypto.randomBytes(48).toString("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // expires in 7 days
  await prisma.session.create({
    data: {
      sessionToken: rawToken,
      userId: userId,
      expiresAt: expiresAt,
      userAgent: userAgent,
    },
  });
  return rawToken;
}

// delete a session from database
async function deleteSession(rawToken) {
  try {
    await prisma.session.delete({
      where: { sessionToken: rawToken },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw error; // session not found
    }
  }
}

module.exports = {
  createSession,
  deleteSession,
};
