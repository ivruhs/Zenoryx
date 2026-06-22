/*
src/middleware/auth.guard.js: The bouncer. It intercepts requests to private routes, extracts and verifies the cookie, confirms the session is still active in the database, and attaches the user identity to the request object.

*/

const primsa = require("../prisma/client");
const { verifyCookie } = require("../auth/crypto");

const protect = async (req, res, next) => {
  try {
    const signedToken = req.cookies["session"];
    if (!signedToken) {
      return res
        .status(401)
        .json({ error: "Authentication required. No session cookie found." });
    }
    const rawToken = verifyCookie(signedToken);
    if (!rawToken) {
      return res
        .status(401)
        .json({ error: "Invalid or tampered session token." });
    }

    const sessionWithUser = await primsa.session.findUnique({
      where: { sessionToken: rawToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    if (!sessionWithUser) {
      return res
        .status(401)
        .json({ error: "Session has expired or been revoked." });
    }

    if (new Date() > sessionWithUser.expiresAt) {
      // Lazy-delete the expired session from DB to keep it clean
      await prisma.session
        .delete({ where: { sessionToken: rawToken } })
        .catch(() => {});
      return res
        .status(401)
        .json({ error: "Session expired. Please log in again." });
    }

    // 5. Success! Attach user context to the request object
    req.user = sessionWithUser.user;
    req.token = rawToken; // Keep the raw token handy in case we need to log out/revoke

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
};
