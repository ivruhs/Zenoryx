import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
//This is the tRPC adapter for Next.js App Router.
//Replaces the older NextApiHandler used in Pages Router.
//Handles GET/POST requests using the Request/Response Web API (not Node.js-specific).

import { type NextRequest } from "next/server";
//NextRequest is the App Router’s Edge-friendly request object.
//Used to access headers, URL, etc.

import { env } from "@/env";
import { appRouter } from "@/server/api/root";
//appRouter: Your tRPC router (the whole API schema)

import { createTRPCContext } from "@/server/api/trpc";
//createTRPCContext: A helper to generate auth/session/context per request

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};
// This wraps your base context creator and passes it the request headers.
// Why headers?
// Often used to extract auth tokens (JWT, Clerk, etc.)
// createTRPCContext might use cookies or headers to get the user session

//🚀 The Main handler Function
const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req), //Injects context (e.g., user info, headers) into each tRPC procedure
    //🔥 Development-Only Error Logging
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
