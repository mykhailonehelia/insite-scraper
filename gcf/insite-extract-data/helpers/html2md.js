import { NodeHtmlMarkdown } from "node-html-markdown";

/**
 * @param {string} html
 */
function html2md(html) {
  return NodeHtmlMarkdown.translate(html);
}

export { html2md };
