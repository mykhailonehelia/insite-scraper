import Redis from "ioredis";
import { Client } from "minio";
import { Readable } from "stream";
import { load } from "cheerio";
import { Message, Progress } from "./types";

export async function pushToService(
  redis: Redis,
  service: string,
  req: string,
  data: object
) {
  const queueName = `queue:${service}`;
  const message = {
    service,
    req,
    data,
  };
  await redis.lpush(queueName, JSON.stringify(message));
}

export async function pushToOrchestrate(
  redis: Redis,
  service: string,
  req: string,
  data: object
) {
  const queueName = `queue:orchestrate:${req}`;
  const message = {
    service,
    req,
    data,
  };
  await redis.lpush(queueName, JSON.stringify(message));
  await redis.publish("orchestrate", JSON.stringify(message));
}

export async function getObjectFromMinio(
  minioClient: Client,
  bucketName: string,
  objectName: string
): Promise<string | null> {
  const truncatedObjectName = objectName.slice(0, 254);
  try {
    const stream = await minioClient.getObject(bucketName, truncatedObjectName);
    let data = "";
    for await (const chunk of stream) {
      data += chunk.toString();
    }
    return data;
  } catch (err) {
    // @ts-ignore
    if (err.code === "NoSuchKey") {
      return null;
    }
    console.log(`OBJECT NAME: ${objectName}`);
    throw err;
  }
}

export async function putObjectToMinio(
  minioClient: Client,
  bucketName: string,
  objectName: string,
  objectValue: string
): Promise<void> {
  const truncatedObjectName = objectName.slice(0, 254);
  try {
    const stream = new Readable({
      read() {
        if (objectValue === "") {
          this.push(" "); // Push a single space if the objectValue is empty
        } else {
          this.push(objectValue);
        }
        this.push(null); // Signal the end of the stream
      },
    });
    await minioClient.putObject(bucketName, truncatedObjectName, stream);
  } catch (err) {
    throw err;
  }
}

export function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const links: string[] = [];
  $("a").each((_, element) => {
    const href = $(element).attr("href");
    if (href) {
      try {
        const url = new URL(href, baseUrl);
        // Remove anything after the hashtag
        url.hash = "";
        links.push(url.href);
      } catch (e) {
        // If the URL is invalid, we skip it
      }
    }
  });
  return links;
}

export function filterLinksByDomain(links: string[], domain: string): string[] {
  const baseHostname = new URL(domain).hostname;
  return links.filter((link) => {
    try {
      const url = new URL(link);
      return url.hostname === baseHostname;
    } catch (e) {
      // If the URL is invalid, we skip it
      return false;
    }
  });
}

/**
 * Retrieves the specified environment variable.
 * Throws an error if the environment variable is not set.
 *
 * @param {string} key - The name of the environment variable.
 * @returns {string} - The value of the environment variable.
 * @throws {Error} - If the environment variable is not set.
 */
export function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is not set`);
  }
  return value;
}

/**
 * Subscribes to a Redis queue and processes messages using the provided callback function.
 *
 * @param {string} service - The name of the Redis queue to subscribe to.
 * @param {Services} services - The services object containing Redis and other services.
 * @param {(msg: message) => Promise<void>} callback - The callback function to process messages.
 */
export async function subscribeToService(
  workerName: string,
  service: string,
  callback: (msg: Message) => Promise<void>
) {
  const sub = new Redis();

  console.log(`${service}[${workerName}]: ready`);
  while (true) {
    const result = await sub.blpop("queue:" + service, 0);
    if (result === null) continue;
    const [listStr, messageStr] = result;
    const msg = Message.parse(JSON.parse(messageStr));
    await callback(msg);
  }
}

/**
 * Retrieves the progress object from Redis for the given request.
 *
 * @param {Redis} redis - The Redis client.
 * @param {string} req - The request identifier.
 * @returns {Promise<Progress>} - The progress object.
 * @throws {Error} - If the progress object is not found.
 */
export async function getProgress(
  redis: Redis,
  req: string
): Promise<Progress> {
  const progressKey = `orchestrate:progress:${req}`;
  const progressStr = await redis.get(progressKey);
  if (!progressStr) {
    throw new Error(`Progress not found for request: ${req}`);
  }
  return Progress.parse(JSON.parse(progressStr));
}

/**
 * Sets the progress object in Redis for the given request.
 *
 * @param {Redis} redis - The Redis client.
 * @param {string} req - The request identifier.
 * @param {Progress} progressData - The progress object to set.
 * @returns {Promise<void>}
 */
export async function setProgress(
  redis: Redis,
  req: string,
  progressData: Progress
): Promise<void> {
  const progressKey = `orchestrate:progress:${req}`;
  await redis.set(progressKey, JSON.stringify(progressData));
}
