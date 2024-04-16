import { Bucket } from "@google-cloud/storage";

class GcsCache {
  /**
   * @param {Bucket} bucket
   */
  constructor(bucket) {
    this.bucket = bucket;
  }

  /**
   * @param {string} key
   */
  async get(key) {
    const resp = await this.bucket.file(key).get();
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  async set(key, value) {}
}
