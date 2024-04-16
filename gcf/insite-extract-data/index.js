import functions from "@google-cloud/functions-framework";
import { Storage } from "@google-cloud/storage";
import { GcsCache } from "./cache.js";
import { runPageSpeed } from "./pagespeed.js";
import { getHtml } from "./scrapingbee.js";
import { html2md } from "./html2md.js";
import { getGemini, prompt } from "./vertex.js";

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
  const md = html2md(rawHtml);

  const gemini = getGemini("default-gas-project", "us-central1");

  const p = `
  The following is markdown from a webpage:
  
  """
  ${md}
  """

  Please extract the following details as a JSON object.

  Example:
  {
    "business_name": ...,
  }
  `;

  const result = await prompt(gemini, p);

  res.status(200).send("<pre>" + result + "</pre>");
});
