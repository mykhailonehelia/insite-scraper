import { Client as MinioClient } from "minio";
import { getEnv } from "./helpers";
import { Services } from "./types";


function getServices() {
  const minioHost = getEnv("MINIO_HOST")
  const minioPort = Number(getEnv("MINIO_PORT"))
  const minioAccessKey = getEnv("MINIO_ACCESS_KEY");
  const minioSecretKey = getEnv("MINIO_SECRET_KEY");
  const inscriptisHost = getEnv("INSCRIPTIS_HOST");
  const scrapingbeeApiKey = getEnv("SCRAPINGBEE_API_KEY");
  const lighthouseApiKey = getEnv("LIGHTHOUSE_API_KEY");

  // this isn't used by any code I wrote, but langchain uses it
  //     so we need to make sure we have it before starting the server
  const unusedOpenAIApiKey = getEnv("OPENAI_API_KEY");

  const minio = new MinioClient({
    endPoint: minioHost,
    port: minioPort,
    useSSL: false,
    accessKey: minioAccessKey,
    secretKey: minioSecretKey,
  });

  const inscriptis = {
    endpoint: `http://${inscriptisHost}:5000/get_text`,
  };

  const scrapingbee = {
    apiKey: scrapingbeeApiKey,
  };

  const lighthouse = {
    apiKey: lighthouseApiKey,
  }

  const services: Services = {
    minio,
    inscriptis,
    scrapingbee,
    lighthouse,
  };

  return services;
}

export const servicesInstance = getServices();