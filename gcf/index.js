import functions from "@google-cloud/functions-framework";
import { Storage } from "@google-cloud/storage";

functions.http("helloHttp", async (req, res) => {
  const storage = new Storage();

  const bucket = storage.bucket("project-insite");

  const [files] = await bucket.getFiles({ prefix: "test1" });

  const fileNames = files.map((f) => f.name);

  res.send(JSON.stringify(fileNames, null, 2));
});
