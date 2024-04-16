import functions from "@google-cloud/functions-framework";
import { Storage } from "@google-cloud/storage";
import { GcsCache } from "./cache.js";
// import { runPageSpeed } from "./pagespeed.js";
import { getHtml } from "./scrapingbee.js";
// import { getGemini, prompt } from "./vertex.js";
import { extractData } from "./extractor.js";
import { getGemini } from "./vertex.js";

functions.http("entry", async (req, res) => {
  const url = req.query.url;
  if (typeof url !== "string" || url === "") {
    throw new Error("Please provide a URL.");
  }

  const storage = new Storage();
  const cache = new GcsCache(storage.bucket("project-insite-cache"));

  const results = { ok: false, data: null };

  //const psRes = await runPageSpeed(url, cache);
  const rawHtml = await getHtml(url, cache);
  if (rawHtml !== null) {
    const gemini = getGemini("default-gas-project", "us-central1");

    const result = await extractData(url, rawHtml, cache, gemini);
    results.ok = true;
    results.data = result;
  }

  res.status(200).send("<pre>" + JSON.stringify(results, null, 2) + "</pre>");
});
