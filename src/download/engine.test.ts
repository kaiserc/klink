import { EventEmitter } from "node:events";
import { describe, it, expect, vi, afterEach } from "vitest";

const constructorCalls: Record<string, unknown>[] = [];

vi.mock("webtorrent", () => {
  return {
    default: class extends EventEmitter {
      torrentPort = 6881;
      constructor(opts?: Record<string, unknown>) {
        super();
        constructorCalls.push(opts ?? {});
      }
      add(): EventEmitter {
        return new EventEmitter();
      }
      throttleDownload(): void {}
      throttleUpload(): void {}
      destroy(): void {}
    },
  };
});

afterEach(() => {
  constructorCalls.length = 0;
  vi.resetModules();
});

describe("TorrentEngine macOS port-5350 fix (#22)", () => {
  it("passes natPmp:false on macOS so mDNSResponder's port 5350 is never bound", async () => {
    const { TorrentEngine } = await import("./engine");
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "darwin" });
    try {
      const engine = new TorrentEngine();
      engine.add(
        "test-id",
        "magnet:?xt=urn:btih:0000000000000000000000000000000000000000",
        "/downloads",
        {},
      );
      engine.destroy();
    } finally {
      Object.defineProperty(process, "platform", { value: original });
    }
    expect(constructorCalls).toHaveLength(1);
    expect(constructorCalls[0]).toMatchObject({ natPmp: false });
  });

  it("does not disable natPmp on Linux (port 5350 is free)", async () => {
    const { TorrentEngine } = await import("./engine");
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });
    try {
      const engine = new TorrentEngine();
      engine.add(
        "test-id",
        "magnet:?xt=urn:btih:0000000000000000000000000000000000000000",
        "/downloads",
        {},
      );
      engine.destroy();
    } finally {
      Object.defineProperty(process, "platform", { value: original });
    }
    expect(constructorCalls).toHaveLength(1);
    expect(constructorCalls[0]).not.toHaveProperty("natPmp", false);
  });

  it("does not disable natPmp on Windows (port 5350 is free)", async () => {
    const { TorrentEngine } = await import("./engine");
    const original = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
      const engine = new TorrentEngine();
      engine.add(
        "test-id",
        "magnet:?xt=urn:btih:0000000000000000000000000000000000000000",
        "/downloads",
        {},
      );
      engine.destroy();
    } finally {
      Object.defineProperty(process, "platform", { value: original });
    }
    expect(constructorCalls).toHaveLength(1);
    expect(constructorCalls[0]).not.toHaveProperty("natPmp", false);
  });

  it("stats(id) ignores getter errors and returns safe defaults", async () => {
    const { TorrentEngine } = await import("./engine");
    const engine = new TorrentEngine();
    const fakeTorrent = new EventEmitter();
    Object.defineProperty(fakeTorrent, "progress", {
      get() {
        throw new Error("Metadata not ready");
      },
    });
    Object.defineProperty(fakeTorrent, "length", {
      get() {
        throw new Error("Metadata not ready");
      },
    });
    // Inject fakeTorrent directly into private torrents map
    (engine as unknown as { torrents: Map<string, unknown> }).torrents.set("bad-id", fakeTorrent);

    const result = engine.stats("bad-id");
    expect(result).not.toBeNull();
    expect(result?.progress).toBe(0);
    expect(result?.total).toBe(0);
    engine.destroy();
  });
});

describe("TorrentEngine.filePaths", () => {
  it("lists a torrent's file paths, and nothing for an unknown id", async () => {
    const { TorrentEngine } = await import("./engine");
    const engine = new TorrentEngine();
    const fakeTorrent = Object.assign(new EventEmitter(), {
      files: [{ path: "Course/1.mp4" }, { path: "Course/2.mp4" }],
    });
    (engine as unknown as { torrents: Map<string, unknown> }).torrents.set("course", fakeTorrent);

    expect(engine.filePaths("course")).toEqual(["Course/1.mp4", "Course/2.mp4"]);
    expect(engine.filePaths("missing")).toEqual([]);
    engine.destroy();
  });
});

describe("TorrentEngine uTP configuration", () => {
  it("disables uTP by default to prevent socket buffer exhaustion (WSAENOBUFS)", async () => {
    const { TorrentEngine } = await import("./engine");
    const origTorlink = process.env.TORLINK_NO_UTP;
    const origKlink = process.env.KLINK_NO_UTP;
    const origEnableTorlink = process.env.TORLINK_ENABLE_UTP;
    const origEnableKlink = process.env.KLINK_ENABLE_UTP;
    delete process.env.TORLINK_NO_UTP;
    delete process.env.KLINK_NO_UTP;
    delete process.env.TORLINK_ENABLE_UTP;
    delete process.env.KLINK_ENABLE_UTP;
    try {
      const engine = new TorrentEngine();
      engine.add(
        "test-id",
        "magnet:?xt=urn:btih:0000000000000000000000000000000000000000",
        "/downloads",
        {},
      );
      engine.destroy();
    } finally {
      if (origTorlink !== undefined) process.env.TORLINK_NO_UTP = origTorlink;
      if (origKlink !== undefined) process.env.KLINK_NO_UTP = origKlink;
      if (origEnableTorlink !== undefined) process.env.TORLINK_ENABLE_UTP = origEnableTorlink;
      if (origEnableKlink !== undefined) process.env.KLINK_ENABLE_UTP = origEnableKlink;
    }
    expect(constructorCalls).toHaveLength(1);
    expect(constructorCalls[0]).toMatchObject({ utp: false });
  });

  it("enables uTP when KLINK_ENABLE_UTP or TORLINK_ENABLE_UTP is set", async () => {
    const { TorrentEngine } = await import("./engine");
    const origTorlink = process.env.TORLINK_NO_UTP;
    const origKlink = process.env.KLINK_NO_UTP;
    const origEnableKlink = process.env.KLINK_ENABLE_UTP;
    delete process.env.TORLINK_NO_UTP;
    delete process.env.KLINK_NO_UTP;
    process.env.KLINK_ENABLE_UTP = "1";
    try {
      const engine = new TorrentEngine();
      engine.add(
        "test-id",
        "magnet:?xt=urn:btih:0000000000000000000000000000000000000000",
        "/downloads",
        {},
      );
      engine.destroy();
    } finally {
      if (origTorlink !== undefined) process.env.TORLINK_NO_UTP = origTorlink;
      if (origKlink !== undefined) process.env.KLINK_NO_UTP = origKlink;
      if (origEnableKlink === undefined) delete process.env.KLINK_ENABLE_UTP;
      else process.env.KLINK_ENABLE_UTP = origEnableKlink;
    }
    expect(constructorCalls).toHaveLength(1);
    expect(constructorCalls[0]).not.toHaveProperty("utp", false);
  });

  it("passes utp:false when TORLINK_NO_UTP or KLINK_NO_UTP is set", async () => {
    const { TorrentEngine } = await import("./engine");
    const origTorlink = process.env.TORLINK_NO_UTP;
    const origKlink = process.env.KLINK_NO_UTP;
    const origEnableKlink = process.env.KLINK_ENABLE_UTP;
    process.env.KLINK_ENABLE_UTP = "1";
    process.env.KLINK_NO_UTP = "1";
    delete process.env.TORLINK_NO_UTP;
    try {
      const engine = new TorrentEngine();
      engine.add(
        "test-id",
        "magnet:?xt=urn:btih:0000000000000000000000000000000000000000",
        "/downloads",
        {},
      );
      engine.destroy();
    } finally {
      if (origTorlink !== undefined) process.env.TORLINK_NO_UTP = origTorlink;
      else delete process.env.TORLINK_NO_UTP;
      if (origKlink !== undefined) process.env.KLINK_NO_UTP = origKlink;
      else delete process.env.KLINK_NO_UTP;
      if (origEnableKlink !== undefined) process.env.KLINK_ENABLE_UTP = origEnableKlink;
      else delete process.env.KLINK_ENABLE_UTP;
    }
    expect(constructorCalls).toHaveLength(1);
    expect(constructorCalls[0]).toMatchObject({ utp: false });
  });
});

describe("TorrentEngine ready handler", () => {
  it("calls onReady once webtorrent has checked the pieces on disk", async () => {
    const { TorrentEngine } = await import("./engine");
    const engine = new TorrentEngine();
    const onReady = vi.fn();
    engine.add(
      "test-id",
      "magnet:?xt=urn:btih:0000000000000000000000000000000000000000",
      "/downloads",
      { onReady },
    );
    // The queue starts a restored seed's missing-file watch from this, so a
    // dropped listener would leave those seeds unwatched.
    const torrent = (engine as unknown as { torrents: Map<string, EventEmitter> }).torrents.get("test-id");
    expect(onReady).not.toHaveBeenCalled();
    torrent?.emit("ready");
    expect(onReady).toHaveBeenCalledTimes(1);
    engine.destroy();
  });
});
