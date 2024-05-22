function batchRequests(
  items,
  genReqFn,
  batchSize = 10
) {
  const taggedItems = items.map((item) => {
    const request = genReqFn(item);
    if (request === null) {
      return { item };
    } else {
      request.muteHttpExceptions = true;
      const readyAt = Date.now();
      const delay = 2;
      return {
        item,
        request,
        readyAt,
        delay,
      };
    }
  });

  const validTaggedItems = taggedItems.filter((taggedItem) => taggedItem.request !== undefined);

  let requestsQueue = [];
  let resultsQueue = [];
  requestsQueue.push(...validTaggedItems);

  while (requestsQueue.length > 0) {
    const readyToSendItems = requestsQueue.filter(
      (curTaggedItem) => curTaggedItem.readyAt <= Date.now()
    );

    if (readyToSendItems.length === 0) {
      Logger.log(
        `there are ${requestsQueue.length} item(s) in the requests queue, but none are ready`
      );
      const furthestReadyAt = requestsQueue.reduce(
        (acc, cur) => Math.max(acc, cur.readyAt),
        0
      );
      const timeToWait = furthestReadyAt - Date.now();
      Logger.log(`waiting for ${timeToWait}ms`);
      Utilities.sleep(timeToWait);
      continue;
    }

    const chunk = readyToSendItems.splice(0, batchSize);
    chunk.forEach((curTaggedItem) => {
      const originalRequestsQueueIndex = requestsQueue.findIndex(
        (rqi) => rqi === curTaggedItem
      );
      if (originalRequestsQueueIndex === -1) {
        throw new Error(`couldn't find original item: ${curTaggedItem}`);
      }
      requestsQueue.splice(originalRequestsQueueIndex, 1);
    });

    const requests = chunk.map((ti) => ti.request);
    Logger.log(`UrlFetchApp.fetchAll(${requests.length})`);
    const responses = UrlFetchApp.fetchAll(requests);

    chunk.forEach((curTaggedItem, curIndex) => {
      const curResponse = responses[curIndex];
      curTaggedItem.item.response = curResponse;
      const curStatusCode = curResponse.getResponseCode();
      if (curStatusCode == 429 || curStatusCode >= 500) {
        curTaggedItem.readyAt = Date.now() + curTaggedItem.delay * 1000;
        curTaggedItem.delay = Math.min(curTaggedItem.delay * 2, 30); // NOTE: hardcoded 30 second max delay
        requestsQueue.push(curTaggedItem);
      } else {
        resultsQueue.push(curTaggedItem);
      }
    });
  }
}

function testBatchRequests() {
  const items = [
    {
      u: "https://google.com",
      meta: { src: "httpbin2", valid: false },
    },
    {
      u: "https://httpbin.org/status/429,200",
      meta: { src: "httpbin1", valid: true },
    },
  ];
  const genReq = (item) => {
    if (item?.meta?.valid !== true) return null;
    return { url: item.u };
  };


  const resps = batchRequests(
    items,
    genReq,
  );

  Logger.log(JSON.stringify(resps, null, 2));
  const t1 = resps[0].response.getContentText();
  Logger.log(t1);
}
