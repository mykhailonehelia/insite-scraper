import { JSDOM } from "jsdom";

/**
 * @param {string} url
 * @param {string} html
 */
function extractData(url, html) {
  const { document } = new JSDOM(html).window;

  /**
   *
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
    return [
      {
        src: resolveUrl(url, src),
        alt,
        width,
        height,
        className,
        id,
      },
    ];
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

export { extractData };

/**
 *
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
 * @returns
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
/*
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
*/
