import Redis from "ioredis";

const redis = new Redis();

async function main() {
  const url = "https://www.canocompletecleaning.com/";
  const msg = {
    service: "newSite",
    req: "test09c9-7ffd-4646-bd97-77616a0408bc",
    data: {
      url,
      callback: "http://localhost:8001",
    },
  };
  await redis.lpush("queue:newSite", JSON.stringify(msg));
  await redis.quit();
}

main();
