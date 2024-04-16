import functions from "@google-cloud/functions-framework";
import { Storage } from "@google-cloud/storage";
import { GcsCache } from "./cache.js";
import { runPageSpeed } from "./pagespeed.js";

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
