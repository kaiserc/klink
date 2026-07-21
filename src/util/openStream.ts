import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

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
  
  let playlistPath: string | null = null;
  try {
    playlistPath = join(tmpdir(), `klink_stream_${randomBytes(4).toString("hex")}.m3u`);
    writeFileSync(playlistPath, `#EXTM3U\n${url}\n`, "utf8");
  } catch {
    // Ignore if we can't create the playlist
  }

  const targetUrl = playlistPath || url;

  const cleanup = () => {
    if (playlistPath) {
      setTimeout(() => {
        try {
          if (playlistPath && existsSync(playlistPath)) {
            unlinkSync(playlistPath);
          }
        } catch {}
      }, 30_000);
    }
  };

  if (process.platform === "win32") {
    if (await launchDetached("vlc", [targetUrl])) { cleanup(); return true; }
    
    // Check common VLC installation paths if it's not in PATH
    const vlcPaths = [
      "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe",
      "C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"
    ];
    for (const vlcPath of vlcPaths) {
      if (existsSync(vlcPath)) {
        if (await launchDetached(vlcPath, [targetUrl])) { cleanup(); return true; }
      }
    }

    if (await launchDetached("mpv", [targetUrl])) { cleanup(); return true; }
    
    // Fallback to explorer, which will open the default media player for the .m3u file
    const res = await launchDetached("explorer", [targetUrl]);
    cleanup();
    return res;
  }
  
  if (process.platform === "darwin") {
    if (await launchDetached("vlc", [targetUrl])) { cleanup(); return true; }
    if (await launchDetached("mpv", [targetUrl])) { cleanup(); return true; }
    const res = await launchDetached("open", [targetUrl]);
    cleanup();
    return res;
  }
  
  for (const [cmd, args] of LINUX_PLAYERS) {
    if (await launchDetached(cmd, [...args, targetUrl])) { cleanup(); return true; }
  }
  cleanup();
  return false;
}

