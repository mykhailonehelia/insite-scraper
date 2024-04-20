import { JSDOM } from "jsdom";
import { resolveUrl, tidy } from "./text.js";

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
function extractDataFromHTML(url, html) {
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

export { extractDataFromHTML };
