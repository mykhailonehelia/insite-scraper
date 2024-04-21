import { GenerativeModel } from "@google-cloud/vertexai";
import { GcsCache } from "./helpers/cache.js";

/**
 * @typedef {{[index: string]: string}} StringIndexedObject
 */

/**
 * @typedef {Object} KVTable
 * @property {"K"} __type
 * @property {string} name
 * @property {StringIndexedObject} data
 */

/**
 * @typedef {Object} ListTable
 * @property {"T"} __type
 * @property {string} name
 * @property {StringIndexedObject[]} data
 */

/**
 * @typedef {KVTable|ListTable} Table
 */

/**
 * @typedef {Object} ExtractorParameters
 * @property {string} url
 * @property {GcsCache} cache
 * @property {GenerativeModel} gemini
 */

/**
 * @typedef {(params: ExtractorParameters) => Promise<Table>} Extractor
 */
