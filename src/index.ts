import * as http from "http";

type ReqRes = {
  req: http.IncomingMessage,
  res: http.ServerResponse
};
const pathToSender: Map<string, ReqRes> = new Map();
const pathToReceivers: Map<string, ReqRes[]> = new Map();
const server = http.createServer((req, res) => {
  if(req.url === undefined) {
    res.writeHead(400)
    res.end("path is required\n");
    return;
  }
  const path = req.url;
  switch (req.method) {
    case "POST":
    case "PUT":
      const receivers = pathToReceivers.get(path);
      pathToReceivers.delete(path);
      if(receivers !== undefined) {
        for(const r of receivers) {
          req.pipe(r.res);
        }
      }
      pathToSender.set(path, {req, res});
      const handleSender = () => {
        pathToSender.delete(path);
        const receivers = pathToReceivers.get(path);
        if(receivers !== undefined) {
          for(const r of receivers) {
            r.res.destroy();
          }
        }
      };
      req.on('close', handleSender);
      req.on('end', handleSender);
      req.on('error', handleSender);
      break;
    case "GET": {
      const sender = pathToSender.get(path);

      const receivers = pathToReceivers.get(path);
      const receiver = {req, res};
      pathToReceivers.set(path, receivers === undefined ? [receiver] : [...receivers, receiver]);

      if(sender !== undefined) {
        sender.req.pipe(res);
      }
      break;
    }
    default:
      res.writeHead(400);
      res.end("Invalid method\n");
  }
});
const httpPort = 8080;
server.listen(httpPort, () => {
  console.log(`Listening on ${httpPort}...`);
});
