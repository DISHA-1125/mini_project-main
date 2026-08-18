import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocketServer } from "./lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";

function getAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      const probe = createServer();

      probe.once("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          resolve(getAvailablePort(port + 1));
          return;
        }
        reject(error);
      });

      probe.once("listening", () => {
        probe.close(() => resolve(port));
      });

      probe.listen(port, hostname);
    };

    tryPort(startPort);
  });
}

(async () => {
  const requestedPort = parseInt(process.env.PORT ?? "3000", 10);
  const port = await getAvailablePort(requestedPort);
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    initSocketServer(server);

    server.listen(port, () => {
      console.log(`> FindIt ready on http://${hostname}:${port}`);
    });
  });
})();
