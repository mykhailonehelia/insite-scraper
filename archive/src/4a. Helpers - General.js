/**
 * @param {string} url
 */
function formatUrl(url) {
  const encodedUrl = encodeURI(url);
  if (!encodedUrl.startsWith("http")) {
    return "http://" + encodedUrl;
  } else {
    return encodedUrl;
  }
}

/**
 * Converts a column letter in A1 notation to a column index.
 * @param {string} columnName - The column letter in A1 notation to convert to index.
 * @returns {number} - The column index corresponding to the column letter.
 */
function columnLetterToIndex(columnName) {
  const charCodeBase = "A".charCodeAt(0);
  let columnIndex = 0;

  for (let i = 0; i < columnName.length; i++) {
    const charCode = columnName.charCodeAt(i) - charCodeBase + 1;
    columnIndex = columnIndex * 26 + charCode;
  }

  return columnIndex;
}

/**
 * Gets the index of the last row that contains data in a specific column of a sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - The sheet to search for data.
 * @param {string} columnLetter - The column letter to check for data.
 * @returns {number} The index of the last row that contains data in the specified column.
 */
function getLastDataRowInColumn(sheet, columnLetter) {
  const columnIndex = columnLetterToIndex(columnLetter);
  const columnValues = sheet
    .getRange(1, columnIndex, sheet.getLastRow(), 1)
    .getValues();

  const lastDataRow = columnValues.reduceRight((acc, currentValue, index) => {
    if (acc === 0 && currentValue[0] !== "") {
      return index + 1;
    }
    return acc;
  }, 0);

  return lastDataRow;
}

/**
 * @param {string} html
 */
function precleanHtml (html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*><\/link>/gi, "")
    .replace(/(class|style|(data|aria)-[a-z-]+)=".*?"/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\n\n+/g, "\n");
};
