import net from "node:net";
import dgram from "node:dgram";
import type { Config } from "../config/config";

const originalNetConnect = net.connect;
const originalNetCreateConnection = net.createConnection;
const originalDgramCreateSocket = dgram.createSocket;

let activeBindAddress: string | null = null;
let patched = false;

export function applyNetworkBinding(config: Config) {
  activeBindAddress = config.bindAddress;

  if (patched) return;
  patched = true;

  const isLoopbackHost = (host: unknown): boolean =>
    host === "127.0.0.1" || host === "localhost" || host === "::1";

  // Patch net.connect and net.createConnection
  const patchNet = (original: any) => {
    return function (this: any, ...args: any[]) {
      if (activeBindAddress) {
        if (args.length > 0 && typeof args[0] === "object" && args[0] !== null) {
          // Do not inject localAddress into Unix domain socket/IPC connections or loopback
          if (!args[0].path && !isLoopbackHost(args[0].host)) {
            args[0] = { ...args[0], localAddress: activeBindAddress };
          }
        } else if (typeof args[0] === "number") {
          const host = typeof args[1] === "string" ? args[1] : undefined;
          if (!isLoopbackHost(host)) {
            const options = {
              port: args[0],
              host,
              localAddress: activeBindAddress,
            };
            const cb = typeof args[args.length - 1] === "function" ? args[args.length - 1] : undefined;
            args = cb ? [options, cb] : [options];
          }
        }
      }
      return original.apply(this, args);
    };
  };

  (net as any).connect = patchNet(originalNetConnect);
  (net as any).createConnection = patchNet(originalNetCreateConnection);

  // Patch dgram.createSocket
  (dgram as any).createSocket = function (this: any, ...args: any[]) {
    const socket = originalDgramCreateSocket.apply(this, args as any);
    const originalBind = socket.bind;
    socket.bind = function (this: any, ...bindArgs: any[]) {
      if (activeBindAddress) {
        if (bindArgs.length > 0 && typeof bindArgs[0] === "object" && bindArgs[0] !== null) {
          if (!bindArgs[0].address) {
            bindArgs[0] = { ...bindArgs[0], address: activeBindAddress };
          }
        } else if (typeof bindArgs[0] === "number") {
          const port = bindArgs[0];
          let address: string = activeBindAddress;
          let cb = undefined;

          if (typeof bindArgs[1] === "string") {
            if (bindArgs[1] === "0.0.0.0" || bindArgs[1] === "::") {
              address = activeBindAddress;
            } else {
              address = bindArgs[1];
            }
            cb = bindArgs[2];
          } else if (typeof bindArgs[1] === "function") {
            cb = bindArgs[1];
          }

          bindArgs = cb ? [port, address, cb] : [port, address];
        } else if (bindArgs.length === 0 || (bindArgs.length === 1 && typeof bindArgs[0] === "function")) {
          // Binding to random port
          const cb = bindArgs[0];
          bindArgs = cb ? [0, activeBindAddress, cb] : [0, activeBindAddress];
        }
      }
      return (originalBind as any).apply(this, bindArgs);
    };
    return socket;
  };
}
