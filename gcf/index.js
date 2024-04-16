import functions from "@google-cloud/functions-framework";
import { Bucket, Storage } from "@google-cloud/storage";
import { promises as fsPromises } from "fs";
import { Readable } from "stream";
import handlebars from "handlebars";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 10);

functions.http("helloHttp", async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  /** @type {object} */
  const data = req.body;
  if (data["Company Info"] === undefined) {
    res.status(400).send("Invalid JSON");
    return;
  }

  const storage = new Storage();
  const bucketName = "project-insite";
  /** @type {string} */
  let folderName;
  const bucket = storage.bucket(bucketName);
  const localTemplateFolderPath = "../template/dynamic"; // Replace with the actual path to the local templates
  let folderExists = true;
  do {
    folderName = nanoid();
    const [files] = await bucket.getFiles({ prefix: folderName }); // Check if the folder already exists
    folderExists = files.length > 0;
  } while (folderExists);

  const localFiles = await fsPromises.readdir(localTemplateFolderPath);

  await Promise.all(
    localFiles.map((fileName) =>
      processAndUploadFile(
        fileName,
        data,
        folderName,
        localTemplateFolderPath,
        bucket
      )
    )
  );

  const url = `https://storage.googleapis.com/${bucketName}/${folderName}/index.html`;
  res.status(200).send({ url });
});

/**
 * @param {string} fileName
 * @param {object} data
 * @param {string} folderName
 * @param {string} localTemplateFolderPath
 * @param {Bucket} bucket
 */
async function processAndUploadFile(
  fileName,
  data,
  folderName,
  localTemplateFolderPath,
  bucket
) {
  const content = await fsPromises.readFile(
    `${localTemplateFolderPath}/${fileName}`,
    "utf8"
  );
  const template = handlebars.compile(content);
  const templatedContent = template(data);
  const newFileName = `${folderName}/${fileName}`;
  const fileStream = new Readable();
  fileStream.push(templatedContent);
  fileStream.push(null);
  const newFile = bucket.file(newFileName);
  await new Promise((resolve, reject) => {
    fileStream
      .pipe(newFile.createWriteStream())
      .on("error", reject)
      .on("finish", resolve);
  });
}
