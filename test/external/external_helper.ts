import { existsSync } from "fs";

export function fetchZip(url: string, hash: string): string {
  const zig_exe = existsSync("./vendor/zig/zig.exe") ? "./vendor/zig/zig.exe" : "zig";
  const env = JSON.parse(
    Bun.spawnSync({
      cmd: [zig_exe, "env"],
      stdin: "inherit",
      stdout: "pipe",
      stderr: "inherit",
    }).stdout.toString(),
  );
  const pkg_dir = env.global_cache_dir + "/p";
  const this_pkg_dir = pkg_dir + "/" + hash;
  if (existsSync(this_pkg_dir)) {
    // success
    return this_pkg_dir;
  }
  // failure; fetch
  console.log("… downloading package: " + url);
  const fetchres = Bun.spawnSync({
    cmd: [zig_exe, "fetch", url],
    stdio: ["inherit", "inherit", "inherit"],
  });
  if (fetchres.exitCode !== 0) throw new Error("bad exit code");
  console.log("→ done!");
  if (existsSync(this_pkg_dir)) {
    // success
    return this_pkg_dir;
  }
  throw new Error("wrong hash");
}
