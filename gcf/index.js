import functions from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import mustache from 'mustache';
import { Readable } from 'stream';

functions.http('helloHttp', async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  let data;
  try {
    data = JSON.parse(req.body);
  } catch (error) {
    res.status(400).send('Bad Request: Invalid JSON');
    return;
  }

  const storage = new Storage();
  const bucketName = 'your-bucket-name';
  const folderName = 'your-folder-name';
  const bucket = storage.bucket(bucketName);

  const [files] = await bucket.getFiles({ prefix: folderName });

  await Promise.all(files.map(async (file) => {
    const [content] = await file.download();
    const templatedContent = mustache.render(content.toString(), data);
    const newFileName = `templated/${file.name}`;
    const fileStream = new Readable();
    fileStream.push(templatedContent);
    fileStream.push(null);
    const newFile = bucket.file(newFileName);
    await new Promise((resolve, reject) => {
      fileStream.pipe(newFile.createWriteStream())
        .on('error', reject)
        .on('finish', resolve);
    });
  }));

  res.status(200).send('Files templated and uploaded successfully');
});
