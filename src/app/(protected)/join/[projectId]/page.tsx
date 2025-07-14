// 🚪 JoinHandler Component - Deep Dive Analysis
// 🎯 System Overview
// This is a Next.js Server Component that handles user
// authentication, automatic user creation, and project membership
// management. It's designed to seamlessly onboard users into projects
//  with a single URL visit.

import { auth, clerkClient } from "@clerk/nextjs/server";

import React from "react";
import { redirect } from "next/navigation";
import { db } from "../../../../server/db";

type Props = {
  params: Promise<{ projectId: string }>;
};

const JoinHandler = async (props: Props) => {
  const { projectId } = await props.params;
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");
  const dbUser = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (!dbUser) {
    await db.user.create({
      data: {
        id: userId,
        emailAddress: user.emailAddresses[0]!.emailAddress,
        imageUrl: user.imageUrl,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  }

  const project = await db.project.findUnique({
    where: {
      id: projectId,
    },
  });

  if (!project) return redirect("/dashboard");
  try {
    await db.userToProject.create({
      data: {
        userId,
        projectId,
      },
    });
  } catch (error) {
    console.log("User already part of the project");
  }
  return redirect(`/dashboard`);
};

export default JoinHandler;

/*
🔄 Complete Flow Diagram
🎭 User Journey Steps
1. 👤 User clicks join link: /join/abc123
2. 🔐 System checks authentication
3. ❌ If not authenticated → /sign-in
4. ✅ If authenticated → Continue
5. 🔍 Check if user exists in local DB
6. 🆕 If not → Create user record
7. 🎯 Validate project exists
8. ❌ If not → /dashboard
9. ✅ If exists → Continue
10. 🤝 Create user-project association
11. 📝 Log if already member
12. 🏠 Redirect to /dashboard

🚨 Error Handling Scenarios
🔍 Authentication Failures
typescriptif (!userId) return redirect("/sign-in");

🚪 Scenario: User not logged in
🔄 Action: Redirect to sign-in page
🎯 UX: Clear path to authentication

🎯 Invalid Project
typescriptif (!project) return redirect("/dashboard");

🚪 Scenario: Project doesn't exist
🔄 Action: Redirect to dashboard
🛡️ Security: Prevents access to invalid projects

🤝 Duplicate Membership
typescriptcatch (error) {
  console.log("User already part of the project");
}

🚪 Scenario: User already joined project
🔄 Action: Log and continue
🎯 UX: Idempotent operation
*/
