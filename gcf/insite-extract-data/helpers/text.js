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

export { tidy, resolveUrl };
