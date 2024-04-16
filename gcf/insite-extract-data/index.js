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

// =======================================

import {
  HarmBlockThreshold,
  HarmCategory,
  VertexAI,
} from "@google-cloud/vertexai";

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

functions.http("vertex", async (req, res) => {
  const project = "default-gas-project";
  const location = "us-central1";
  const model = "gemini-1.0-pro";
  const vertex = new VertexAI({ project, location });

  const gemini = vertex.getGenerativeModel({ model, safetySettings });

  const query = req.query.q;
  if (typeof query !== "string") {
    res.status(400).send("please specify a query");
    return;
  }
  const result = await gemini.generateContent(query);
  const parsedResult = parseGeminiResponse(result.response);
  res.status(200).send(parsedResult);
});

/**
 * @param {import("@google-cloud/vertexai").GenerateContentResponse} response
 * @returns {string}
 */
function parseGeminiResponse(response) {
  if (response.candidates === undefined) {
    throw new Error(`Got unexpected result from Gemini: ${response}`);
  } else {
    let txt = "";
    response.candidates.forEach((candidate) => {
      candidate.content.parts.forEach((part) => {
        txt += `${part.text}\n`;
      });
    });
    return txt;
  }
}
