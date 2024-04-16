import { GcsCache } from "./cache.js";
import { ScrapingBeeClient } from "scrapingbee";

/**
 * @param {string} url
 * @param {GcsCache} cache
 * @returns {Promise<object|null>}
 */
async function getRawScrapingBeeResponse(url, cache) {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (apiKey === undefined) {
    throw new Error("no scrapingbee api key defined");
  }

  let response;

  const cacheKey = [url, "raw-scrapingbee-response"];
  const cachedResponse = await cache.get(cacheKey);
  if (cachedResponse !== null) {
    response = JSON.parse(cachedResponse);
  } else {
    const client = new ScrapingBeeClient(apiKey);
    try {
      const result = await client.get({
        url: url,
        params: {
          screenshot: true,
          screenshot_full_page: true,
          wait_browser: "load",
          block_resources: false,
          json_response: true,
        },
      });
      const td = new TextDecoder();
      response = JSON.parse(td.decode(result.data));
    } catch (err) {
      console.error(err);
      response = null;
    }
    await cache.set(cacheKey, JSON.stringify(response));
  }

  return response;
}

/**
 * @param {string} url
 * @param {GcsCache} cache
 * @returns {Promise<string|null>}
 */
async function getHtml(url, cache) {
  const response = await getRawScrapingBeeResponse(url, cache);
  return response ? response.body : null;
}

/**
 * @param {string} url
 * @param {GcsCache} cache
 * @returns {Promise<Buffer|null>}
 */
async function getScreenshotData(url, cache) {
  const response = await getRawScrapingBeeResponse(url, cache);
  if (response === null) return null;
  /** @type {string} */
  const base64Encoded = response.screenshot;
  const buf = Buffer.from(base64Encoded, "base64");
  return buf;
}

export { getHtml, getScreenshotData };
