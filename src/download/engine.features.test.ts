import { EventEmitter } from "node:events";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockTorrentMap = new Map<string, any>();
const throttleCalls: { down: number; up: number }[] = [];
let mockAddTorrent: ((t: any) => void) | null = null;

vi.mock("webtorrent", () => {
  return {
    default: class extends EventEmitter {
      torrentPort = 6881;
      throttleDownload(rate: number): void {
        throttleCalls.push({ down: rate, up: 0 });
      }
      throttleUpload(rate: number): void {
        const last = throttleCalls[throttleCalls.length - 1];
        if (last) last.up = rate;
      }
      add(_source: string, _opts: any, cb?: (t: any) => void): EventEmitter {
        const t = new EventEmitter() as any;
        t.destroy = vi.fn();
        if (cb && mockAddTorrent) {
          mockAddTorrent(t);
          cb(t);
        }
        return t;
      }
      destroy(): void {}
    },
  };
});

afterEach(() => {
  mockTorrentMap.clear();
  throttleCalls.length = 0;
  mockAddTorrent = null;
  vi.resetModules();
});

describe("TorrentEngine Fork Features", () => {
  it("getPeers(id) parses active peer wire details", async () => {
    const { TorrentEngine } = await import("./engine");
    const engine = new TorrentEngine();

    const fakeTorrent = {
      wires: [
        {
          remoteAddress: "192.168.1.100",
          peerExtendedHandshake: { v: "uTorrent/3.5.5" },
          peerId: "peer-1",
          downloaded: 1048576,
          uploaded: 524288,
          downloadSpeed: () => 50000,
          uploadSpeed: () => 10000,
        },
        {
          remoteAddress: "10.0.0.5",
          peerExtendedHandshake: null,
          peerId: "peer-2",
          downloaded: 0,
          uploaded: 0,
          downloadSpeed: () => 0,
          uploadSpeed: () => 0,
        },
      ],
    };

    (engine as unknown as { torrents: Map<string, unknown> }).torrents.set("t1", fakeTorrent);

    const peers = engine.getPeers("t1");
    expect(peers).toHaveLength(2);
    expect(peers![0]).toEqual({
      ip: "192.168.1.100",
      client: "uTorrent/3.5.5",
      peerId: "peer-1",
      downloaded: 1048576,
      uploaded: 524288,
      downSpeed: 50000,
      upSpeed: 10000,
    });
    expect(peers![1]).toEqual({
      ip: "10.0.0.5",
      client: "Unknown",
      peerId: "peer-2",
      downloaded: 0,
      uploaded: 0,
      downSpeed: 0,
      upSpeed: 0,
    });

    expect(engine.getPeers("nonexistent")).toBeNull();
    engine.destroy();
  });

  it("getFiles() and toggleFileSelection() manage file selection and piece selection", async () => {
    const { TorrentEngine } = await import("./engine");
    const engine = new TorrentEngine();

    const selectSpy1 = vi.fn();
    const deselectSpy1 = vi.fn();
    const selectSpy2 = vi.fn();
    const deselectSpy2 = vi.fn();

    const fakeTorrent = {
      files: [
        { path: "video.mp4", length: 1000, downloaded: 500, select: selectSpy1, deselect: deselectSpy1 },
        { path: "subs.srt", length: 50, downloaded: 50, select: selectSpy2, deselect: deselectSpy2 },
      ],
    };

    (engine as unknown as { torrents: Map<string, unknown> }).torrents.set("t1", fakeTorrent);

    // Initial files list (all selected by default)
    const initialFiles = engine.getFiles("t1");
    expect(initialFiles).toHaveLength(2);
    expect(initialFiles![0]).toMatchObject({ path: "video.mp4", selected: true });
    expect(initialFiles![1]).toMatchObject({ path: "subs.srt", selected: true });

    // Deselect video.mp4
    engine.toggleFileSelection("t1", "video.mp4", false);
    expect(engine.isDeselected("t1", "video.mp4")).toBe(true);
    expect(deselectSpy1).toHaveBeenCalledOnce();
    expect(selectSpy2).toHaveBeenCalled(); // shared pieces re-selected for subs.srt

    const updatedFiles = engine.getFiles("t1");
    expect(updatedFiles![0]?.selected).toBe(false);
    expect(updatedFiles![1]?.selected).toBe(true);

    // Re-select video.mp4
    engine.toggleFileSelection("t1", "video.mp4", true);
    expect(engine.isDeselected("t1", "video.mp4")).toBe(false);
    expect(selectSpy1).toHaveBeenCalled();

    engine.destroy();
  });

  it("setThrottle() applies bandwidth limits to WebTorrent client", async () => {
    const { TorrentEngine } = await import("./engine");
    const engine = new TorrentEngine();

    // Trigger client creation
    (engine as unknown as { ensureClient: () => void }).ensureClient();

    // Enable throttle with 1MB/s down and 500KB/s up
    engine.setThrottle(true, 1_000_000, 500_000);
    expect(throttleCalls).toContainEqual({ down: 1_000_000, up: 500_000 });

    // Disable throttle
    engine.setThrottle(false, 1_000_000, 500_000);
    expect(throttleCalls).toContainEqual({ down: -1, up: -1 });

    engine.destroy();
  });

  it("fetchMetadata() rejects with timeout if swarm does not respond", async () => {
    const { TorrentEngine } = await import("./engine");
    const engine = new TorrentEngine();

    // mockAddTorrent is null, so the add callback is never called
    await expect(
      engine.fetchMetadata("dead-torrent", "magnet:?xt=urn:btih:dead", 50)
    ).rejects.toThrow("Timeout fetching torrent metadata");

    engine.destroy();
  });

  it("fetchMetadata() resolves files when torrent metadata arrives", async () => {
    const { TorrentEngine } = await import("./engine");
    const engine = new TorrentEngine();

    mockAddTorrent = (t) => {
      t.files = [
        { path: "track1.mp3", length: 12345 },
        { path: "track2.mp3", length: 67890 },
      ];
    };

    const files = await engine.fetchMetadata("live-torrent", "magnet:?xt=urn:btih:live", 1000);
    expect(files).toHaveLength(2);
    expect(files[0]).toMatchObject({ path: "track1.mp3", length: 12345, selected: true });

    engine.destroy();
  });
});

