import functions from "@google-cloud/functions-framework";
import { Storage } from "@google-cloud/storage";
import { GcsCache } from "./cache.js";
// import { runPageSpeed } from "./pagespeed.js";
import { getHtml } from "./scrapingbee.js";
// import { html2md } from "./html2md.js";
// import { getGemini, prompt } from "./vertex.js";
import { extractData } from "./extractor.js";

functions.http("entry", async (req, res) => {
  /** @type {string} */
  const url = req.query.url;
  if (url === undefined) {
    throw new Error("Please provide a URL.");
  }

  const storage = new Storage();
  const cache = new GcsCache(storage.bucket("project-insite-cache"));

  //const psRes = await runPageSpeed(url, cache);
  const rawHtml = await getHtml(url, cache);
  //const md = html2md(rawHtml);

  const result = extractData(url, rawHtml);

  res.status(200).send("<pre>" + JSON.stringify(result, null, 2) + "</pre>");
});
