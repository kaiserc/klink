import http from "node:http";
import serveHandler from "serve-handler";
import { promises as fs } from "node:fs";
import path from "node:path";
import { renderDirectoryListing } from "./daemon/template";
import { safeResolve } from "./daemon/files";

let server: http.Server | null = null;
let activeDir: string | null = null;
let activePort: number | null = null;

export async function startWebServer(dir: string, port: number): Promise<void> {
  const resolvedDir = path.resolve(dir);
  if (server && activeDir === resolvedDir && activePort === port) return;
  if (server) {
    stopWebServer();
  }

  const nextServer = http.createServer(async (request, response) => {
    try {
      const urlPath = (request.url || "/").split("?")[0]!;
      const resolvedFullPath = safeResolve(resolvedDir, urlPath);

      if (resolvedFullPath) {
        const stat = await fs.stat(resolvedFullPath).catch(() => null);
        if (stat && stat.isDirectory()) {
          const decodedPath = decodeURIComponent(urlPath);
          const names = await fs.readdir(resolvedFullPath).catch(() => []);
          const entries = await Promise.all(
            names.map(async (name) => {
              const childStat = await fs.stat(path.join(resolvedFullPath, name)).catch(() => null);
              return {
                name,
                type: (childStat?.isDirectory() ? "dir" : "file") as "dir" | "file",
                size: childStat?.isFile() ? childStat.size : undefined,
              };
            }),
          );

          const html = renderDirectoryListing(decodedPath, entries);
          response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          response.end(request.method === "HEAD" ? undefined : html);
          return;
        }
      }
    } catch {
      // Ignore errors and fall back to serveHandler
    }

    return serveHandler(request, response, {
      public: resolvedDir,
      directoryListing: false,
    });
  });

  return new Promise((resolve, reject) => {
    nextServer.once("error", (err) => {
      if (server === nextServer) {
        server = null;
        activeDir = null;
        activePort = null;
      }
      reject(err);
    });
    nextServer.listen(port, () => {
      server = nextServer;
      activeDir = resolvedDir;
      activePort = port;
      resolve();
    });
  });
}

export function stopWebServer(): void {
  if (server) {
    try {
      server.close();
    } catch {}
    server = null;
    activeDir = null;
    activePort = null;
  }
}
