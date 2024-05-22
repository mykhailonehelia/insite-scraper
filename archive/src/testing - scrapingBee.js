const CACHE_FOLDER_ID = "15Wbe027Lcj4VkV3-ObL_mFCKRlzF4k_a";
const SCRAPINGBEE_RAW_RESPONSE_FILE_NAME = "Raw Response from ScrapingBee";
const TXT_FILE_NAME = "Website Text";
const HTML_FILE_NAME = "Website HTML";
const INFO_SHEET_NAME = "Website Info";
const SCREENSHOT_NAME = "Screenshot.png";
/**
 * @param {DriveApp.Folder} parentFolder
 * @param {string} name
 */
function getFolderByName(parentFolder, name) {
  const folders = [];
  const iter = parentFolder.getFoldersByName(name);
  while (iter.hasNext()) folders.push(iter.next());
  if (folders.length > 1) {
    throw new Error(`Got multiple folders for name: ${name}`);
  } else if (folders.length === 1) {
    return folders[0];
  } else {
    return null;
  }
}

/**
 * @param {DriveApp.Folder} parentFolder
 * @param {string} name
 */
function getFileByName(parentFolder, name) {
  const files = [];
  const iter = parentFolder.getFilesByName(name);
  while (iter.hasNext()) files.push(iter.next());
  if (files.length > 1) {
    throw new Error(`Got multiple files for name: ${name}`);
  } else if (files.length === 1) {
    return files[0];
  } else {
    return null;
  }
}

function getTxtFileAsString(fileId) {
  return DriveApp.getFileById(fileId).getBlob().getDataAsString();
}

function setTxtFileAsString(fileId, contents) {
  DriveApp.getFileById(fileId).setContent(contents);
}

function createTxtFile(parentFolder, fileName, contents) {
  const file = DriveApp.createFile(fileName, contents, "text/plain");
  file.moveTo(parentFolder);
}

function getScrapingBeeApiKey() {
  return PropertiesService.getScriptProperties().getProperty("SCRAPINGBEE_API_KEY");
}

function callScrapingBee(url) {
  const apiKey = getScrapingBeeApiKey();
  const encodedUrl = encodeURIComponent(url);
  const sbUrl = `https://app.scrapingbee.com/api/v1/?api_key=${apiKey}&url=${encodedUrl}&screenshot=true&screenshot_full_page=true&wait_browser=load&block_resources=false&json_response=true`;
  Logger.log(`SCRAPINGBEE: ${sbUrl}`)
  const resp = UrlFetchApp.fetch(sbUrl);
  return resp.getContentText();
}

function html2Txt(html) {
  const htmlBlob = Utilities.newBlob(html);
  const apiEndpoint = "https://weblyzard-inscriptis-o2f7ttbgxq-uc.a.run.app/get_text";
  const resp = UrlFetchApp.fetch(apiEndpoint, {
    method: "post",
    headers: {
      "Content-Type": "text/html; encoding=UTF-8"
    },
    payload: htmlBlob
  });

  return resp.getContentText();
}

class Website {
  constructor(url) {
    if (!url.startsWith("http")) {
      throw new Error(`Website url must start with either http:// or https://`);
    }
    this.url_ = url;
    this.folder = this.getFolder_();
    // fill out all the documents
    this.raw = this.getRawScrapingBeeResponse_();
    this.html = this.getHtml();
    this.text = this.getText();
    this.infoSheet = this.getInfoSheetTESTING();
    this.screenshot = this.getScreenshot();
  }

  getHtml() {
    return this.getOrCreateTxtFile_(HTML_FILE_NAME, () => {
      const data = JSON.parse(this.raw);
      return data.body;
    });
  }
  getText() {
    return this.getOrCreateTxtFile_(TXT_FILE_NAME, () => {
      return html2Txt(this.html);
    });
  }

  getRawScrapingBeeResponse_() {
    return this.getOrCreateTxtFile_(SCRAPINGBEE_RAW_RESPONSE_FILE_NAME, () => {
      return callScrapingBee(this.url_);
    });
  }

  getOrCreateTxtFile_(fileName, createFn) {
    const websiteFolder = this.getFolder_();
    const file = getFileByName(websiteFolder, fileName);
    if (file !== null) {
      return getTxtFileAsString(file.getId());
    } else {
      const contents = createFn();
      createTxtFile(websiteFolder, fileName, contents);
      return contents;
    }
  }

  getFolder_() {
    const cacheFolder = DriveApp.getFolderById(CACHE_FOLDER_ID);
    const folders = [];
    const folderIter = cacheFolder.getFoldersByName(this.url_);
    while (folderIter.hasNext()) {
      folders.push(folderIter.next());
    }
    if (folders.length > 1) {
      throw new Error(`Multiple folders for url: ${this.url_}`);
    } else if (folders.length === 1) {
      return folders[0];
    } else {
      const newFolder = cacheFolder.createFolder(this.url_);
      return newFolder;
    }
  }

  getInfoSheetTESTING() {
    const existingSpreadsheet = getFileByName(this.folder, INFO_SHEET_NAME);
    if (existingSpreadsheet !== null) {
      return existingSpreadsheet;
    } else {
      const ss = SpreadsheetApp.create(INFO_SHEET_NAME);
      DriveApp.getFileById(ss.getId()).moveTo(this.folder);
      populateSpreadsheetFromHtml(this.html, ss);
      return ss;
    }
  }

  getScreenshot() {
    const existingScreenshot = getFileByName(this.folder, SCREENSHOT_NAME);
    if (existingScreenshot !== null) {
      return existingScreenshot;
    } else {
      const screenshotEncoded = JSON.parse(this.raw).screenshot;
      const screenshotBlob = Utilities.newBlob(Utilities.base64Decode(screenshotEncoded), 'image/png', SCREENSHOT_NAME);
      const folder = DriveApp.getFolderById(this.folder.getId());
      const file = folder.createFile(screenshotBlob);
      return file;
    }
  }
}

function extractMetadata($) {
  const getMetaContent = (attribute) => (
    $(`meta[property="og:${attribute}"]`).attr("content") ||
    $(`meta[name="${attribute}"]`).attr("content")
  );

  return {
    title: getMetaContent("title") || $("title").text(),
    description: getMetaContent("description"),
    url: $(`meta[property="og:url"]`).attr("content"),
    site_name: getMetaContent("site_name"),
    image: $(`meta[property="og:image"]`).attr("content") || $(`meta[property="og:image:url"]`).attr("content"),
    icon: $("link[rel='icon']").attr("href") || $("link[rel='shortcut icon']").attr("href"),
    keywords: getMetaContent("keywords"),
    author: getMetaContent("author"),
    published_time: getMetaContent("published_time"),
    modified_time: getMetaContent("modified_time"),
    generator: getMetaContent("generator"),
    language: getMetaContent("language"),
    og_type: getMetaContent("type"),
    og_app_id: getMetaContent("app_id"),
    og_locale: getMetaContent("locale"),
    twitter_card: getMetaContent("twitter:card"),
    twitter_site: getMetaContent("twitter:site")
    // Add more metadata fields as needed
  };
}

function appendRows(sheet, rows) {
  const maxNumCols = rows.reduce((max, row) => Math.max(max, row.length), 0);

  if (rows.length === 0) return;
  const filledData = rows.map((row) =>
    row.length < maxNumCols
      ? row.concat(Array(maxNumCols - row.length).fill(null))
      : row
  );

  const lastRow = sheet.getLastRow();
  const numRows = filledData.length;
  const numCols = maxNumCols;
  const range = sheet.getRange(lastRow + 1, 1, numRows, numCols);
  range.setValues(filledData);
}
function getHeadersText($, selector) {
  return Array.from($(selector)).map((header) => $(header).text());
}
function getLinksData($) {
  return Array.from($("a")).map((a) => ({
    text: $(a).text().trim(),
    href: $(a).attr("href"),
  }));
}

function getImagesData($) {
  return Array.from($("img")).map((img) => ({
    src: $(img).attr("src"),
    alt: $(img).attr("alt"),
  }));
}

function populateSpreadsheetFromHtml(html, spreadsheet) {
  const $ = load(html);

  const metadata = extractMetadata($);
  const links = getLinksData($);
  const images = getImagesData($);
  const headers = {
    h1: getHeadersText($, "h1"),
    h2: getHeadersText($, "h2"),
    h3: getHeadersText($, "h3"),
    h4: getHeadersText($, "h4"),
    h5: getHeadersText($, "h5"),
    h6: getHeadersText($, "h6"),
  };

  const metadataSheet = spreadsheet.insertSheet("Metadata");
  let row = 1;
  Object.keys(metadata).forEach(key => {
    metadataSheet.getRange(`A${row}`).setValue(key.charAt(0).toUpperCase() + key.slice(1));
    metadataSheet.getRange(`B${row}`).setValue(metadata[key]);
    row++;
  });

  const linksSheet = spreadsheet.insertSheet("Links");
  appendRows(
    linksSheet,
    [["Text", "Href"], ...links.map(link => [link.text, link.href])]
  );

  const imagesSheet = spreadsheet.insertSheet("Images");
  appendRows(
    imagesSheet,
    [["Src", "Alt"], ...images.map(img => [img.src, img.alt])]
  );

  Object.keys(headers).forEach((headerKey, index) => {
    const headerSheet = spreadsheet.insertSheet(`Header ${index + 1}`);
    headerSheet.getRange("A1").setValue("Header Text");
    appendRows(headerSheet, headers[headerKey].map(text => [text]));
  });
}

function myFunction() {
  const website = new Website("https://www.arcticairac.com/");
  Logger.log(website.getScreenshot().getSize());
}
