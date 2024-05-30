import { Client as MinioClient } from "minio";
import { getEnv } from "./helpers";
import { Services } from "./types";


function getServices() {
  const minioHost = getEnv("MINIO_HOST")
  const minioPort = Number(getEnv("MINIO_PORT"))
  const minioAccessKey = getEnv("MINIO_ACCESS_KEY");
  const minioSecretKey = getEnv("MINIO_SECRET_KEY");
  const inscriptisHost = getEnv("INSCRIPTIS_HOST");

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

  const services: Services = {
    minio,
    inscriptis,
  };

  return services;

}

export const servicesInstance = getServices();