// 🔄 SyncUser Component - Deep Dive Analysis
// 🎯 System Overview
// This is a Next.js Server Component that acts as a critical
// authentication middleware, ensuring perfect synchronization
// between Clerk authentication service and your local database.
// It's designed to handle user data consistency, profile updates,
// and seamless user onboarding.

import { auth, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";

const SyncUser = async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  if (!user.emailAddresses[0]?.emailAddress) {
    return notFound();
  }

  await db.user.upsert({
    where: {
      emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
    },
    update: {
      imageUrl: user.imageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    create: {
      id: userId,
      emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: user.imageUrl,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });

  return redirect("/dashboard");
};

export default SyncUser;

/*
🔄 Use Cases & Scenarios
🎯 Primary Use Cases
1. 🆕 New User Onboarding
User signs up → Clerk creates account → SyncUser creates DB record
2. 🔄 Profile Updates
User updates profile in Clerk → SyncUser syncs changes to DB
3. 🔧 Data Reconciliation
DB and Clerk out of sync → SyncUser brings them in sync
4. 🚪 Post-Login Sync
User logs in → SyncUser ensures latest profile data
*/
