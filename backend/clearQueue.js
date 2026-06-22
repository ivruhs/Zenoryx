// clearQueue.js

const { ingestionQueue } = require("./src/queues/queue");

async function clear() {
  await ingestionQueue.obliterate({ force: true });
  console.log("Queue cleared!");
  process.exit(0);
}

clear();
