// src/queues/queue.js

/**
 * When the user submits a repo, parsing it might take 5 minutes. We cannot keep the HTTP connection open for that long(it will timeout). So instead our API server acts as a post office. It takes the package(repo ID) and drops it in a mailbox (the BullMQ Queue) and immediately tells the user, "Thanks, we got your package. We'll let you know when it's ready."
 *
 * This file defines that mailbox. It connects to Upstash Redis which acts as the physical storage for our queue.
 */

const { Queue } = require("bullmq");
const Redis = require("ioredis");
const config = require("../config");
const logger = require("../lib/logger");

// Upstash strictly requires TLS (Transport Layer Security) for connections. So we must disable 'enableReadyCheck' and set 'maxRetriesPerRequest' to null for BullMQ to work with Upstash Redis.

// creating a new Redis connection to Upstash Redis
const redisConnection = new Redis(config.redisUrl, {
  tls: {},
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (err) => {
  logger.error(err, "Redis connection error in Queue");
});

const ingestionQueue = new Queue("ingestion", {
  connection: redisConnection,
});

module.exports = {
  ingestionQueue,
  redisConnection,
};
