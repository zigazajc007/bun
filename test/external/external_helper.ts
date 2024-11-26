import { $ } from "bun";
import { existsSync } from "fs";
import { expect } from "bun:test";

function syncExecPromise<T>(v: () => Promise<T>): T {
  let err = null;
  let res: T | null = null;
  let success = false;
  expect(
    (async (): Promise<number> => {
      try {
        res = await v();
      } catch (e) {
        err = e;
      }
      success = true;
      return 0;
    })(),
  ).resolves.toBe(0);
  if (!success) throw new Error("promise did not sync exec");
  if (err != null) throw err;
  return res as T;
}

// ./vendor/zig/zig.exe fetch

export function fetchZip(url: string, hash: string): string {
  return syncExecPromise(() => fetchZipAsync(url, hash));
}
async function fetchZipAsync(url: string, hash: string): Promise<string> {
  const zig_exe = "./vendor/zig/zig.exe";
  const env = await $`${zig_exe} env`.json();
  const pkg_dir = env.global_cache_dir + "/p";
  const this_pkg_dir = pkg_dir + "/" + hash;
  if (existsSync(this_pkg_dir)) {
    // success
    return this_pkg_dir;
  }
  // failure; fetch
  console.log("… downloading package: " + url);
  await $`${zig_exe} fetch ${url}`;
  console.log("→ done!");
  if (existsSync(this_pkg_dir)) {
    // success
    return this_pkg_dir;
  }
  throw new Error("wrong hash");
}
