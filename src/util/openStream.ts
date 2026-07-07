import { spawn } from "node:child_process";

function launchDetached(cmd: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(cmd, args, {
        detached: true,
        stdio: "ignore",
      });
      proc.unref();

      let settled = false;
      proc.on("error", () => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      });

      // If the process survives for 500ms without an ENOENT error, assume it launched.
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(true);
        }
      }, 500);
    } catch {
      resolve(false);
    }
  });
}

const LINUX_PLAYERS: [string, string[]][] = [
  ["vlc", []],
  ["mpv", []],
  ["xdg-open", []],
];

export async function openStream(url: string): Promise<boolean> {
  if (!url) return false;
  
  if (process.platform === "win32") {
    if (await launchDetached("vlc", [url])) return true;
    if (await launchDetached("mpv", [url])) return true;
    return launchDetached("explorer", [url]);
  }
  
  if (process.platform === "darwin") {
    if (await launchDetached("vlc", [url])) return true;
    if (await launchDetached("mpv", [url])) return true;
    return launchDetached("open", [url]);
  }
  
  for (const [cmd, args] of LINUX_PLAYERS) {
    if (await launchDetached(cmd, [...args, url])) return true;
  }
  return false;
}
