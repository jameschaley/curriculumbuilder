import http from "node:http";
import next from "next";

const dev = true;
const hostname = "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

http
  .createServer((request, response) => {
    handle(request, response);
  })
  .listen(port, hostname, () => {
    console.log(`Mixed-Age Curriculum Builder ready at http://${hostname}:${port}`);
  });
