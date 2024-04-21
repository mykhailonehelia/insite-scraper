import { Bucket } from "@google-cloud/storage";
import { Mutex } from "async-mutex";

class GcsCache {
  /**
   * @param {Bucket} bucket
   */
  constructor(bucket) {
    this.bucket = bucket;
    this.mutex = new Mutex();
    /** @type {import("../types").StringIndexedObject} */
    this.cache = {};
  }

  /**
   * @param {string[]} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    const encodedKey = GcsCache.sanitizeKey(key);
    if (this.cache[encodedKey] !== undefined) {
      console.log(`GET (CACHED) ${encodedKey}`);
      return this.cache[encodedKey];
    }
    const release = await this.mutex.acquire();
    console.log(`GET ${encodedKey}`);

    try {
      const [file] = await this.bucket.file(encodedKey).download();
      const str = file.toString();
      this.cache[encodedKey] = str;
      release();
      return str;
    } catch (err) {
      release();
      if (err.code === 404) {
        return null;
      } else {
        throw err;
      }
    }
  }

  /**
   * @param {string[]} key
   * @param {string} value
   */
  async set(key, value) {
    const release = await this.mutex.acquire();
    const encodedKey = GcsCache.sanitizeKey(key);
    this.cache[encodedKey] = value;
    console.log(`SET ${encodedKey}`);

    await this.bucket.file(encodedKey).save(value, {
      contentType: "text/plain",
    });
    release();
  }

  /**
   * @param {string[]} key
   * @returns {string}
   */
  static sanitizeKey(key) {
    return key.map((keyPiece) => encodeURIComponent(keyPiece)).join("/");
  }
}

/**
 * @template T
 * @param {GcsCache} cache
 * @param {string[]} key
 * @param {() => Promise<T>} func
 * @returns {Promise<T>}
 */
async function useCache(cache, key, func) {
  const cachedResponse = await cache.get(key);
  let response;
  if (cachedResponse !== null) {
    response = JSON.parse(cachedResponse);
  } else {
    response = await func();
    await cache.set(key, JSON.stringify(response));
  }
  return response;
}

export { GcsCache, useCache };
