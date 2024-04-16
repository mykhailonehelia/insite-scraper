import { GenerativeModel } from "@google-cloud/vertexai";
import { JSDOM } from "jsdom";
import Vibrant from "node-vibrant";
import { extractJson, prompt } from "./vertex.js";
import { getScreenshotData } from "./scrapingbee.js";
import { GcsCache } from "./cache.js";
import { html2md } from "./html2md.js";

/**
 * @param {string} url
 * @param {string} html
 * @param {GcsCache} cache
 * @param {GenerativeModel} gemini
 */
async function extractData(url, html, cache, gemini) {
  const rawData = extractRawData(url, html);

  const logo = await getLogoImageUrl(rawData.images, gemini);
  const colors = await getColors(url, cache);

  const companyInfo = await extractCompanyInfo(html, gemini);

  return {
    "Company Info": {
      __type: "K",
      data: {
        Name: companyInfo.businessName,
        Phone: companyInfo.phoneNumber,
        Email: companyInfo.emailAddress,
        Tagline: companyInfo.tagline,
        "Street Address": companyInfo.address.street,
        City: companyInfo.address.city,
        State: companyInfo.address.state,
        Zip: companyInfo.address.zip,
      },
    },
    Style: {
      __type: "K",
      data: {
        "Primary Color": colors.primary,
        "Accent Color": colors.secondary,
        "Dark Color": colors.dark,
      },
    },
    Images: {
      __type: "K",
      data: {
        "Logo Image URL": logo,
      },
    },
    Services: {
      __type: "T",
    },
    Other: {
      services: companyInfo.services,
      socialMediaLinks: companyInfo.socialMedia,
      mapsLink: companyInfo.mapsLink,
    },
  };
}

/**
 * @param {Image[]} images
 * @param {GenerativeModel} gemini
 * @returns {Promise<string|null>}
 */
async function getLogoImageUrl(images, gemini) {
  const p = `
  Here are a list of images pulled from a website:
  """
  ${JSON.stringify(images)}
  """

  Please return a single JSON object corresponding to the logo image in a code block, or null if none of them are the logo.
  `;

  const resp = await prompt(gemini, p);
  let src = null;
  try {
    src = extractJson(resp).src;
    if (src === undefined) src = null;
  } catch (err) {
    console.error(`error parsing JSON from gemini: ${err}.`);
    src = null;
  }
  return src;
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");

/**
 * @param {string} url
 * @param {GcsCache} cache
 */
async function getColors(url, cache) {
  /** @type {{[type: string]: string|null}} */
  const colors = {
    primary: null,
    secondary: null,
    dark: null,
  };
  const screenshotBuffer = await getScreenshotData(url, cache);
  if (screenshotBuffer === null) return colors;

  const palette = await Vibrant.from(screenshotBuffer).getPalette();
  const primary = palette.Vibrant?.rgb;
  const secondary = palette.Muted?.rgb;
  const dark = palette.DarkMuted?.rgb;
  colors.primary = primary ? rgbToHex(...primary) : null;
  colors.secondary = secondary ? rgbToHex(...secondary) : null;
  colors.dark = dark ? rgbToHex(...dark) : null;
  return colors;
}

/**
 * @typedef {object} Image
 * @property {string} src
 * @property {string} alt
 * @property {string} width
 * @property {string} height
 * @property {string} className
 * @property {string} id
 */

/**
 * @param {string} url
 * @param {string} html
 */
function extractRawData(url, html) {
  const { document } = new JSDOM(html).window;

  /**
   * @param {string} selector
   * @param {(e: Element) => *} mapFn
   * @returns
   */
  const elemObjs = (selector, mapFn) => {
    return Array.from(document.querySelectorAll(selector)).flatMap(mapFn);
  };
  // colors / fonts / styles
  // text (headers, keywords)
  // images (logo, background)
  const images = elemObjs("img", (img) => {
    // @ts-ignore
    const { src, alt, width, height, className, id } = img;
    if (width === 0 || height === 0) return [];
    /** @type {Image} */
    const result = {
      src: resolveUrl(url, src),
      alt,
      width,
      height,
      className,
      id,
    };
    return [result];
  });

  /**
   *
   * @param {HTMLHeadingElement} headerElement
   * @returns
   */
  const extractHeaderInfo = (headerElement) => {
    const text = tidy(headerElement.textContent || "");
    if (text !== "") {
      return [text];
    } else {
      return [];
    }
  };

  const headers = {
    // @ts-ignore
    h1: elemObjs("h1", extractHeaderInfo),
    // @ts-ignore
    h2: elemObjs("h2", extractHeaderInfo),
    // @ts-ignore
    h3: elemObjs("h3", extractHeaderInfo),
    // @ts-ignore
    h4: elemObjs("h4", extractHeaderInfo),
    // @ts-ignore
    h5: elemObjs("h5", extractHeaderInfo),
    // @ts-ignore
    h6: elemObjs("h6", extractHeaderInfo),
  };

  const result = { images, headers };

  return result;
}

/**
 * @param {string} text
 * @returns {string}
 */
function tidy(text) {
  return text
    .replaceAll("\t", " ")
    .replaceAll("\n", " ")
    .replaceAll(/  +/g, " ")
    .trim();
}

/**
 * @param {string} from
 * @param {string} to
 */
function resolveUrl(from, to) {
  const resolvedUrl = new URL(to, new URL(from, "resolve://"));
  if (resolvedUrl.protocol === "resolve:") {
    // `from` is a relative URL.
    const { pathname, search, hash } = resolvedUrl;
    return pathname + search + hash;
  }
  return resolvedUrl.toString();
}

async function extractCompanyInfo(html, gemini) {
  const md = html2md(html);
  const p = `
  The following is markdown from a webpage:
  
  """
  ${md}
  """

  Please extract the following details as a JSON object.
  If any fields aren't included, they should be null. If all fields within an object are null, mark each individual property as null, rather than the object.
  Do not include any extra fields in the JSON response.

  Example:
  {
    "businessName": "",
    "tagline": "",
    "phoneNumber": "",
    "emailAddress": "",
    "address": {
      "street": "",
      "city": "",
      "state": "",
      "zip": ""
    },
    "services": ["service1", "service2"],
    "socialMedia": ["link1", "link2"],
    "mapsLink": "",
  }
  `;

  const resp = await prompt(gemini, p);
  return extractJson(resp);
}

export { extractData };
