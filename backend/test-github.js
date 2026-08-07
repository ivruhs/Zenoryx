require("dotenv").config();

const { Octokit } = require("@octokit/rest");

(async () => {
  console.log("Token loaded:", !!process.env.GITHUB_TOKEN);

  if (process.env.GITHUB_TOKEN) {
    console.log(
      "Token prefix:",
      process.env.GITHUB_TOKEN.substring(0, 12) + "..."
    );
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  try {
    // Test 1: Authenticate
    const { data: user } = await octokit.rest.users.getAuthenticated();

    console.log("\n✅ Authentication successful");
    console.log("Username:", user.login);

    // Test 2: Fetch the public repository
    const { data: repo } = await octokit.rest.repos.get({
      owner: "staringelf",
      repo: "React-Todo-List",
    });

    console.log("\n✅ Repository access successful");
    console.log("Repository:", repo.full_name);

    // Test 3: Fetch HEAD commit (same API your app uses)
    const { data: commit } = await octokit.rest.repos.getCommit({
      owner: "staringelf",
      repo: "React-Todo-List",
      ref: "HEAD",
    });

    console.log("\n✅ HEAD commit fetched successfully");
    console.log("SHA:", commit.sha);
  } catch (err) {
    console.log("\n❌ Request failed");
    console.log("Status :", err.status);
    console.log("Message:", err.message);

    if (err.response) {
      console.log("Response:", err.response.data);
    }
  }
})();