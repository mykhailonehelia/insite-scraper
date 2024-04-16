import { GcsCache } from "./cache.js";

/**
 *
 * @param {GcsCache} cache
 * @param {string[]} key
 * @param {() => Promise<any>} func
 */
async function useCache(cache, key, func) {
  const cachedResponse = await cache.get(key);
  let response;
  if (cachedResponse !== null) {
    response = JSON.parse(cachedResponse);
  } else {
    const response = await func();
    await cache.set(key, JSON.stringify(response));
  }
  return response;
}

export { useCache };
