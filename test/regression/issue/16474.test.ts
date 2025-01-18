import { mkdirSync } from "fs";
import { mkdir } from "fs/promises";
import { test, expect } from "bun:test";
import { tmpdirSync } from "harness";
import { join } from "path";

test("fs.mkdir recursive should not error on existing", async () => {
  const testDir = tmpdirSync();

  const dir1 = join(testDir, "test123");
  expect(mkdirSync(dir1, { recursive: true })).toBe(dir1);
  expect(mkdirSync(dir1, { recursive: true })).toBeUndefined();

  const dir2 = join(testDir, "test456");
  expect(await mkdir(dir2)).toBeUndefined();
  expect(await mkdir(dir2, { recursive: true })).toBeUndefined();
});
