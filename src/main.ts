import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";


import express, { Request, Response } from "express";
import bodyParser from "body-parser";

import Tiktoken from "tiktoken";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// @ts-ignore
import ColorThief from "colorthief";
import chroma from "chroma-js";

import { load } from "cheerio";

import pRetry from "p-retry";
import pLimit from "p-limit";



const fetchExternalImageLimit = pLimit(1);

import {
  CompanyInfoStructuredData,
  RequestSchema,
  ReviewsStructuredData,
  Services,
  ServicesStructuredData,
  SocialMediaLinkSchema,
} from "./types";
import {
  extractLinksFromHtml,
  filterLinksByDomain,
  getObjectFromMinio,
  putObjectToMinio,
} from "./helpers";
import { servicesInstance } from "./services";


async function run(services: Services, url: string, companyName: string) {
  console.log(`main: starting run for ${companyName} (${url})`);
  const pLighthouse = getLighthouse(services, url);

  const pFetchAllHtml = fetchAllHtml(services, url);
  const pAllText = pFetchAllHtml.then(async (pages) => {
    const txtPromises = Object.values(pages).map((e) => htmlToText(services, e.html));
    const allTxt = await Promise.all(txtPromises);
    const cleanedLines = Array.from(
      new Set(
        allTxt
          .join("\n")
          .split("\n")
          .map((l) => l.trim())
      )
    );
    return cleanedLines.join("\n");
  });

  const pStructuredData = pAllText.then(extractStructuredData);
  const pSocialMediaLinks = pFetchAllHtml.then(async () =>
    extractSocialMediaLinks(services, url)
  );
  const pColorScheme = pFetchAllHtml.then(async () =>
    extractColors(services, url)
  );
  const pImages = pFetchAllHtml.then(async () => extractImages(services, url));
  const pLogo = pImages.then(async (images) => getLogo(images, companyName));

  const lighthouse = await pLighthouse;
  let structuredData = {
    CompanyInfo: {}, Services: { services: [] }, Reviews: { reviews: [] }
  };
  try {
    // @ts-ignore
    structuredData = await pStructuredData;
  } catch (err) {
    console.error(`error extracting structured data for ${url}: ${err}`);
  }
  const colorScheme = await pColorScheme;
  const logoUrl = await pLogo;
  const socialMediaLinks = await pSocialMediaLinks;

  const finalResult = {
    url,
    lighthouse,
    data: {
      logoUrl,
      colorScheme,
      socialMediaLinks: socialMediaLinks.socialMediaLinks,
      companyInfo: structuredData.CompanyInfo,
      services: structuredData.Services.services,
      reviews: structuredData.Reviews.reviews,
    },
  };

  return finalResult;
}

async function extractSocialMediaLinks(services: Services, url: string) {
  const htmlKey = `html:${encodeURIComponent(url)}`;
  const html = await getObjectFromMinio(
    services.minio,
    "insite-cache",
    htmlKey
  );
  if (html === null)
    return SocialMediaLinkSchema.parse({ socialMediaLinks: [] });

  const allLinks = extractLinksFromHtml(html, url);

  const model = new ChatOpenAI({
    model: "gpt-3.5-turbo",
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Extract social media (facebook, twitter, etc) links from the following list of URLs. Return a structured output with 'platform' and 'url' for each link. If no links, simply return an empty array.",
    ],
    ["user", "{links}"],
  ]);

  const chain = prompt.pipe(model.withStructuredOutput(SocialMediaLinkSchema));

  const response = await pRetry(() => chain.invoke({ links: allLinks.join("\n") }), { retries: 5, onFailedAttempt: (err) => { console.error(`got error trying to extract social media links: ${err}`) } });
  return response;
}


async function getLogo(
  images: { src: string | null; alt: string }[],
  companyName: string
) {
  const model = new ChatOpenAI({
    model: "gpt-4o",
  });

  const fetchImageData = async (src: string | null) => {
    if (!src) return null;
    try {
      const response = await fetch(src);
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    } catch (error) {
      console.error(`Failed to fetch image from ${src}:`, error);
      return null;
    }
  };

  const results = await Promise.all(
    images.map(async (image) => {
      if (!image.src) return { src: image.src, isLogo: false };
      const imageData = await fetchExternalImageLimit(() =>
        fetchImageData(image.src)
      );
      if (!imageData) return { src: image.src, isLogo: false };

      const prompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `Is the following image a logo for the company "${companyName}"? Alt text: ${image.alt}`,
        ],
        [
          "user",
          [
            {
              type: "image_url",
              image_url: `data:image/jpeg;base64,${imageData}`,
              detail: "low",
            },
          ],
        ],
      ]);

      const chain = prompt.pipe(model).pipe(new StringOutputParser());

      let response;
      try {
        response = await chain.invoke({ base64: imageData });
      } catch (err) {
        console.error(`failed to query with image: ${image.src}`);
        return { src: image.src, isLogo: false };
      }
      const isLogo = response.toLowerCase().includes("yes");

      return { src: image.src, isLogo };
    })
  );

  const logo = results.find((result) => result.isLogo);
  return logo ? logo.src : null;
}

async function extractImages(services: Services, url: string) {
  const htmlKey = `html:${encodeURIComponent(url)}`;
  const html = await getObjectFromMinio(
    services.minio,
    "insite-cache",
    htmlKey
  );
  if (html === null) return [];

  const $ = load(html);
  const images = $("img")
    .map((_, element) => {
      let src = $(element).attr("src") || null;
      const alt = $(element).attr("alt") || "";

      // Convert relative URLs to absolute URLs
      if (src && !src.startsWith("http")) {
        try {
          const absoluteUrl = new URL(src, url);
          src = absoluteUrl.href;
        } catch (e) {
          console.error(`Invalid URL: ${src}`);
        }
      }

      return { src, alt };
    })
    .get();

  return images;
}

async function extractColors(services: Services, url: string) {
  const objectKey = `screenshot:${encodeURIComponent(url)}`;
  const screenshotBase64 = await getObjectFromMinio(
    services.minio,
    "insite-cache",
    objectKey
  );

  if (!screenshotBase64) return null;

  const dirTmp = await fs.mkdtemp(path.join(os.tmpdir(), "insite-"));
  const fileTmp = path.join(dirTmp, "temp_screenshot.png");

  // Decode base64 and save to a temporary file
  const buffer = Buffer.from(screenshotBase64, "base64");
  await fs.writeFile(fileTmp, buffer);

  // Extract the color palette
  const palette: [number, number, number][] = await ColorThief.getPalette(
    fileTmp,
    10
  );

  // Delete the temporary file
  await fs.rm(dirTmp, { recursive: true });

  return extractColorScheme(palette);
}

function extractColorScheme(colors: [number, number, number][]) {
  const hslColors = colors.map((rgb) => chroma(rgb).hsl());

  const lightestColor = hslColors.reduce((acc, cur) =>
    cur[2] > acc[2] ? cur : acc
  );
  const darkestColor = hslColors.reduce((acc, cur) =>
    cur[2] < acc[2] ? cur : acc
  );

  // Sort colors by saturation (index 1 in HSL) in descending order
  const sortedBySaturation = [...hslColors].sort((a, b) => b[1] - a[1]);

  // Get the two most vibrant colors
  const [mostVibrant, secondMostVibrant] = sortedBySaturation.slice(0, 2);

  // Find their positions in the original array
  const mostVibrantIndex = hslColors.indexOf(mostVibrant);
  const secondMostVibrantIndex = hslColors.indexOf(secondMostVibrant);

  // Determine primary and secondary colors based on their original positions
  const primaryColor =
    mostVibrantIndex < secondMostVibrantIndex ? mostVibrant : secondMostVibrant;
  const secondaryColor =
    mostVibrantIndex < secondMostVibrantIndex ? secondMostVibrant : mostVibrant;

  return {
    light: chroma(lightestColor, "hsl").hex(),
    dark: chroma(darkestColor, "hsl").hex(),
    primary: chroma(primaryColor, "hsl").hex(),
    secondary: chroma(secondaryColor, "hsl").hex(),
  };
}

async function extractStructuredData(txt: string) {
  const modelName = "gpt-3.5-turbo";
  const encoding = Tiktoken.encoding_for_model(modelName);
  const numTokens = encoding.encode(txt).length;

  // gpt-3.5-turbo has 16k context
  if (numTokens > 14000) {
    throw new Error(`too many tokens: ${numTokens}`);
  }

  const model = new ChatOpenAI({
    model: modelName,
    maxRetries: 6,
  });

  const prompts = [
    {
      name: "CompanyInfo",
      type: CompanyInfoStructuredData,
      prompt: "Please extract company info from the following text:",
    },
    {
      name: "Reviews",
      type: ReviewsStructuredData,
      prompt: "Please extract all reviews from the following text:",
    },
    {
      name: "Services",
      type: ServicesStructuredData,
      prompt:
        "Please extract all services (for example: rug cleaning, window cleaning, dryer vent cleaning) from the following text:\nDescriptions should be 5-8 words, names should only be 1-4 words.",
    },
  ];

  let retObj: { [name: string]: object } = {};

  const promises = prompts.map(async (pObj) => {
    const prompt = `
    ${pObj.prompt} 

    ${txt}
    `;
    const queryModel = async () => {
      const result = await model
        .withStructuredOutput(pObj.type, { name: pObj.name })
        .invoke(["human", prompt]);
      retObj[pObj.name] = result;
    };
    await pRetry(queryModel, { retries: 5 });
  });

  await Promise.all(promises);
  return retObj;
}

async function htmlToText(services: Services, html: string) {
  const response = await fetch(services.inscriptis.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/html",
    },
    body: html,
  });

  if (!response.ok) {
    throw new Error(`Failed to extract text: ${response.statusText}`);
  }

  return response.text();
}



const scrapingBeeLimitFn = pLimit(5);

async function fetchAllHtml(services: Services, url: string) {
  const urls = { [url]: { status: false, html: "" } };

  const remaining = () =>
    Object.entries(urls)
      .filter((e) => e[1].status === false)
      .map((e) => e[0]);

  let rem = remaining();
  while (rem.length > 0) {
    const a = rem.map((u) => processPage(services, url, u));
    const pages = await Promise.all(a);
    for (const doneLink of rem) {
      urls[doneLink].status = true;
    }
    for (const page of pages) {
      urls[page.url].status = true;
      urls[page.url].html = page.html;
      for (const todoLink of page.links) {
        if (urls[todoLink] === undefined) {
          urls[todoLink] = { status: false, html: "" };
        }
      }
    }
    rem = remaining();
  }
  return urls;
}

async function processPage(services: Services, baseUrl: string, url: string) {
  const html = await scrapingBeeLimitFn(() => fetchHtml(services, url));
  const allLinks = extractLinksFromHtml(html, baseUrl);
  const links = filterLinksByDomain(allLinks, baseUrl);
  return { url, html, links };
}

async function fetchHtml(services: Services, url: string) {
  const { minio } = services;
  const bucketName = "insite-cache";
  const objectName = "html:" + encodeURIComponent(url);
  const screenshotName = "screenshot:" + encodeURIComponent(url);

  // Check if the HTML is already cached in Minio
  const cachedHtml = await getObjectFromMinio(minio, bucketName, objectName);
  if (cachedHtml) {
    console.log(`fetchHtml: returning cached content for ${url}`);
    return cachedHtml;
  }
  console.log(`fetchHtml: fetching ${url}`);
  const encodedUrl = encodeURIComponent(url);
  const apiKey = services.scrapingbee.apiKey;
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${apiKey}&url=${encodedUrl}&block_resources=false&json_response=true&screenshot=true&wait=5000`;

  let response;
  try {
    response = await fetch(apiUrl);
  } catch (error) {
    console.error(`fetchHtml: error: ${error}`);
    await putObjectToMinio(minio, bucketName, objectName, "");
    return "";
  }

  if (!response.ok) {
    console.error(
      `fetchHtml: Failed to fetch HTML content for ${url}: ${response.statusText} (Status Code: ${response.status})`
    );

    // Store an empty string in Minio
    await putObjectToMinio(minio, bucketName, objectName, "");
    return "";
  }

  const resp = await response.json();
  const html = resp.body;
  const screenshotBase64 = resp.screenshot;

  // Store the fetched HTML in Minio
  await putObjectToMinio(minio, bucketName, objectName, html);
  await putObjectToMinio(minio, bucketName, screenshotName, screenshotBase64);

  return html;
}

async function getLighthouse(services: Services, url: string) {
  const apiKey = services.lighthouse.apiKey;

  const { minio } = services;
  const bucketName = "insite-cache";
  const objectName = "lighthouse:" + encodeURIComponent(url);

  console.log(`lighthouse: fetching Lighthouse scores for ${url}`);
  // Check if the HTML is already cached in Minio
  const cachedResponse = await getObjectFromMinio(
    minio,
    bucketName,
    objectName
  );
  if (cachedResponse) {
    //console.log( `fetchHtml (${workerName}): returning cached content for ${data.url}`);
    if (!cachedResponse || cachedResponse === " ") {
      return {};
    } else {
      return JSON.parse(cachedResponse);
    }
  }
  const encodedUrl = encodeURIComponent(url);
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodedUrl}&key=${apiKey}&category=performance&category=accessibility&category=best-practices&category=seo&strategy=mobile`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    console.error(
      `lighthouse: Failed to fetch Lighthouse scores for ${url}: ${response.statusText} (Status Code: ${response.status})`
    );

    // Store an empty string in Minio
    await putObjectToMinio(minio, bucketName, objectName, JSON.stringify({}));
    return {};
  }

  const lighthouseData = await response.json();
  const scores = {
    performance: lighthouseData.lighthouseResult.categories.performance.score,
    accessibility:
      lighthouseData.lighthouseResult.categories.accessibility.score,
    bestPractices:
      lighthouseData.lighthouseResult.categories["best-practices"].score,
    seo: lighthouseData.lighthouseResult.categories.seo.score,
  };

  // Store the fetched HTML in Minio
  await putObjectToMinio(minio, bucketName, objectName, JSON.stringify(scores));

  return scores;
}

const app = express();
app.use(bodyParser.json());

const postResponseLimit = pLimit(1);

app.get("/", async (req: Request, res: Response) => {
  res.status(200).json({ message: "Server is up" });
})

app.post("/process", async (req: Request, res: Response) => {
  const services = servicesInstance;
  const parsedRequest = RequestSchema.parse(req.body);
  const { sites, callback } = parsedRequest;

  res.status(200).json({ message: "processing started" });

  await Promise.all(
    sites.map(async (site) => {
      let result;
      try {
        result = await run(services, site.url, site.companyName);
      } catch (err) {
        console.error(err);
        result = { url: site.url, error: JSON.stringify(err) };
      }
      await postResponseLimit(async () => {
        try {
          const resp = await fetch(callback, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify([result]),
          });
          if (resp.status !== 200) {
            throw new Error(`got status ${resp.status}`);
          }
          console.log(`DONE: ${site.url}`);
        } catch (err) {
          console.error(`unable to send results to ${callback}: ${err}`)
        }
      });
    })
  );
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  // ensure that services are loaded before server start
  const services = servicesInstance;
  console.log(`Server is running on port ${port}`);
});

export { };
