import functions from "@google-cloud/functions-framework";
import { Bucket, Storage } from "@google-cloud/storage";
import { promises as fsPromises } from "fs";
import { Readable } from "stream";
import handlebars from "handlebars";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 10);

functions.http("entry", async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  /** @type {object} */
  const data = req.body;
  if (data.data === undefined) {
    res.status(400).send("Invalid JSON");
    return;
  }
  const cleanedData = tidySchema(data);
  console.log(JSON.stringify(cleanedData, null, 2));
  const storage = new Storage();
  const bucketName = "project-insite";
  /** @type {string} */
  let folderName;
  const bucket = storage.bucket(bucketName);
  const localTemplateFolderPath = "./template"; // Replace with the actual path to the local templates
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
        cleanedData,
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

/**
 * @param {*} inputObject
 */
function tidySchema(inputObject) {
  const root = inputObject.data;

  const companyInfo = root["Company Info"].data;
  const colors = root.Colors.data;
  const images = root.Images.data;
  const rawServices = root.Services.data;
  const mappedServices = rawServices.map((service) => {
    return {
      name: service.Name,
      description: service.Description,
      icon: service["Font Awesome Icon"],
    };
  });

  return {
    companyInfo: {
      name: companyInfo.Name,
      phone: companyInfo.Phone,
      email: companyInfo.Email,
      preferredMethodOfContact: companyInfo["Preferred Method of Contact"],
      streetAddress: companyInfo["Street Address"],
      city: companyInfo.City,
      state: companyInfo.State,
      zip: companyInfo.Zip,
    },
    colors: {
      primary: colors["Primary Color"],
      accent: colors["Accent Color"],
      dark: colors["Dark Color"],
    },
    images: {
      logo: images["Logo Image URL"],
    },
    services: mappedServices,
  };
}
