import { useCache } from "./cache.js";
import { ScrapingBeeClient } from "scrapingbee";

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<object|null>}
 */
async function getRawScrapingBeeResponse(params) {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (apiKey === undefined) {
    throw new Error("no scrapingbee api key defined");
  }

  const cacheKey = [params.url, "raw-scrapingbee-response"];
  const response = useCache(params.cache, cacheKey, async () => {
    const client = new ScrapingBeeClient(apiKey);
    try {
      const result = await client.get({
        url: params.url,
        params: {
          screenshot: true,
          screenshot_full_page: true,
          wait_browser: "load",
          block_resources: false,
          json_response: true,
        },
      });
      const td = new TextDecoder();
      return JSON.parse(td.decode(result.data));
    } catch (err) {
      console.error(err);
      return null;
    }
  });

  return response;
}

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<string>}
 */
async function getHtml(params) {
  const response = await getRawScrapingBeeResponse(params);
  return response ? response.body : "";
}

/**
 * @param {import("../types.js").ExtractorParameters} params
 * @returns {Promise<Buffer|null>}
 */
async function getScreenshotData(params) {
  const response = await getRawScrapingBeeResponse(params);
  if (response === null) return null;
  /** @type {string} */
  const base64Encoded = response.screenshot;
  const buf = Buffer.from(base64Encoded, "base64");
  return buf;
}

export { getHtml, getScreenshotData };
