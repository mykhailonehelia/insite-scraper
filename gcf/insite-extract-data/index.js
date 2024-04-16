import functions from "@google-cloud/functions-framework";
import google from "googleapis";
import { Storage } from "@google-cloud/storage";
import { GcsCache } from "./cache.js";

functions.http("entry", async (req, res) => {
  /** @type {string} */
  const url = req.query.url;
  if (url === undefined) {
    throw new Error("Please provide a URL.");
  }

  const storage = new Storage();
  const cache = new GcsCache(storage.bucket("project-insite-cache"));

  const psRes = await runPageSpeed(url, cache);

  res.status(200).send(JSON.stringify(psRes, null, 2));
});

/**
 * @param {string} url
 * @param {GcsCache} cache
 */
async function runPageSpeed(url, cache) {
  const cacheKey = ["pagespeed", url];
  const cacheResp = await cache.get(cacheKey);
  let rawResponse;
  if (cacheResp !== null) {
    rawResponse = JSON.parse(cacheResp);
  } else {
    const client = new google.pagespeedonline_v5.Pagespeedonline({});
    const options = {
      category: ["BEST_PRACTICES", "PERFORMANCE", "ACCESSIBILITY", "SEO"],
      url,
      strategy: "mobile",
    };

    const resp = await client.pagespeedapi.runpagespeed(options);
    rawResponse = resp.data;

    await cache.set(cacheKey, JSON.stringify(rawResponse));
  }

  const lhRes = rawResponse.lighthouseResult;
  if (lhRes === undefined) {
    throw new Error(
      `Received invalid response running pagespeed for url: ${url}`
    );
  }

  const result = {
    url: lhRes.finalUrl,
    performance: lhRes.categories?.performance?.score,
    accessibility: lhRes.categories?.accessibility?.score,
    best_practices: lhRes.categories?.["best-practices"]?.score,
    seo: lhRes.categories?.seo?.score,
  };

  return result;
}
