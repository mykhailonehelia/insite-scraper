import functions from "@google-cloud/functions-framework";
import { Storage } from "@google-cloud/storage";
import { GcsCache } from "./helpers/cache.js";
// import { runPageSpeed } from "./pagespeed.js";
import { getHtml } from "./helpers/scrapingbee.js";
// import { getGemini, prompt } from "./vertex.js";
import { extractData } from "./extractor.js";
import { getGemini } from "./helpers/gemini.js";

functions.http("entry", async (req, res) => {
  const url = req.query.url;
  if (typeof url !== "string" || url === "") {
    throw new Error("Please provide a URL.");
  }

  const storage = new Storage();
  const cache = new GcsCache(storage.bucket("project-insite-cache"));
  const gemini = getGemini("default-gas-project", "us-central1");

  /**
   * @typedef {object} Results
   * @property {boolean} ok
   * @property {{[key: string]: import("./types.js").Table}|null} data
   */

  /** @type {Results} */
  const results = {
    ok: false,
    data: null,
  };

  const params = {
    url,
    cache,
    gemini,
  };
  const rawHtml = await getHtml(params);
  if (rawHtml !== null) {
    const result = await extractData(params);
    results.ok = true;
    results.data = result;
  }

  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify(results));
});
