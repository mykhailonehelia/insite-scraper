import { Client } from "minio";
import { Readable } from "stream";
import { load } from "cheerio";

export async function getObjectFromMinio(
  minioClient: Client,
  bucketName: string,
  objectName: string
): Promise<string | null> {
  const truncatedObjectName = objectName.slice(0, 254);
  try {
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, "");
    }

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
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, "");
    }

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
