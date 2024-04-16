import functions from "@google-cloud/functions-framework";
import { Storage } from "@google-cloud/storage";
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

  let data;
  try {
    data = JSON.parse(req.body);
  } catch {
    res.status(400).send("Bad Request: Invalid JSON");
    return;
  }

  const storage = new Storage();
  const bucketName = "your-bucket-name";
  let folderName;
  const bucket = storage.bucket(bucketName);
  const localTemplateFolderPath = "path/to/local/templates"; // Replace with the actual path to the local templates
  let folderExists = true;
  do {
    folderName = nanoid();
    const [files] = await bucket.getFiles({ prefix: folderName });
    folderExists = files.length > 0;
  } while (folderExists);

  const localFiles = await fsPromises.readdir(localTemplateFolderPath);

  await Promise.all(
    localFiles.map(async (fileName) => {
      const content = await fsPromises.readFile(
        `${localTemplateFolderPath}/${fileName}`,
        "utf8"
      );
      const template = handlebars.compile(content);
      const templatedContent = template(data);
      const newFileName = `${folderName}/${fileName}`;
      const template = handlebars.compile(content.toString());
      const templatedContent = template(data);
      const newFileName = `${folderName}/${file.name}`;
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
    })
  );

  res.status(200).send("Files templated and uploaded successfully");
});
