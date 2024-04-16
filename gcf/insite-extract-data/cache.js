import { Bucket } from "@google-cloud/storage";

class GcsCache {
  /**
   * @param {Bucket} bucket
   */
  constructor(bucket) {
    this.bucket = bucket;
  }

  /**
   * @param {string[]} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    const encodedKey = GcsCache.sanitizeKey(key);
    console.log(`GET ${encodedKey}`);

    try {
      const [file] = await this.bucket.file(encodedKey).download();
      return file.toString();
    } catch (err) {
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
    const encodedKey = GcsCache.sanitizeKey(key);
    console.log(`SET ${encodedKey}`);

    await this.bucket.file(encodedKey).save(value, {
      contentType: "text/plain",
    });
  }

  /**
   * @param {string[]} key
   * @returns {string}
   */
  static sanitizeKey(key) {
    return key.map((keyPiece) => encodeURIComponent(keyPiece)).join("/");
  }
}

export { GcsCache };
