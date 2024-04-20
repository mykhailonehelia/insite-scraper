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

  const results = { ok: false, data: null };

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

  res.status(200).send("<pre>" + JSON.stringify(results, null, 2) + "</pre>");
});
