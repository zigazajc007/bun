import { describe, test, expect } from "bun:test" with { todo: "true" };
import { bunEnv, bunExe, tempDirWithFiles } from "harness";

/*
Potential solutions:
- Option 1: Make a fake export `export const my_string = undefined;` and make sure it is not enumerable
- Option 2: In b.ts, make javascriptcore skip re-exporting something if it is not found rather than SyntaxErroring
  - this won't work because in the import {} export {} case, the error will be on the import
*/

const a_file = `
  export type my_string = "1";

  export type my_value = "2";
  export const my_value = "2";

  export const my_only = "3";
`;
const a_no_value = `
  export type my_string = "1";
  export type my_value = "2";
  export const my_only = "3";
`;
const a_with_value = `
  export type my_string = "1";
  export const my_value = "2";
`;
const b_files = [
  {
    name: "export from",
    value: `export { my_string, my_value, my_only } from "./a.ts";`,
  },
  {
    name: "import then export",
    value: `
      import { my_string, my_value, my_only } from "./a.ts";
      export { my_string, my_value, my_only };
    `,
  },
  {
    name: "export star",
    value: `export * from "./a.ts";`,
  },
  {
    name: "export merge",
    value: `export * from "./a_no_value.ts"; export * from "./a_with_value.ts"`,
  },
];
const c_files = [
  { name: "require", value: `console.log(JSON.stringify(require("./b")));` },
  { name: "import star", value: `import * as b from "./b"; console.log(JSON.stringify(b));` },
  { name: "await import", value: `console.log(JSON.stringify(await import("./b")));` },
  {
    name: "import individual",
    value: `
      import { my_string, my_value, my_only } from "./b";
      console.log(JSON.stringify({ my_only, my_value }));
    `,
  },
];
for (const b_file of b_files) {
  describe(`re-export with ${b_file.name}`, () => {
    for (const c_file of c_files) {
      describe(`import with ${c_file.name}`, () => {
        const dir = tempDirWithFiles("type-export", {
          "a.ts": a_file,
          "b.ts": b_file.value,
          "c.ts": c_file.value,

          "a_no_value.ts": a_no_value,
          "a_with_value.ts": a_with_value,
        });

        const runAndVerify = (filename: string) => {
          const result = Bun.spawnSync({
            cmd: [bunExe(), "run", filename],
            cwd: dir,
            env: bunEnv,
            stdio: ["inherit", "pipe", "inherit"],
          });

          expect(result.exitCode).toBe(0);
          expect(JSON.parse(result.stdout.toString().trim())).toEqual({ my_value: "2", my_only: "3" });
        };

        test("run", () => {
          runAndVerify("c.ts");
        });

        test("build", async () => {
          const build_result = await Bun.build({
            entrypoints: [dir + "/c.ts"],
            outdir: dir + "/dist",
          });
          expect(build_result.success).toBe(true);
          runAndVerify(dir + "/dist/c.js");
        });
      });
    }
  });
}

describe("import not found", () => {
  for (const [ccase, target_value, name] of [
    [``, /SyntaxError: Export named 'not_found' not found in module '[^']+?'\./, "none"],
    [
      `export default function not_found() {};`,
      /SyntaxError: Export named 'not_found' not found in module '[^']+?'\. Did you mean to import default\?/,
      "default with same name",
    ],
    [
      `export type not_found = "not_found";`,
      /SyntaxError: Export named 'not_found' not found in module '[^']+?'\./,
      "type",
    ],
  ] as const)
    test(`${name}`, () => {
      const dir = tempDirWithFiles("type-export", {
        "a.ts": ccase,
        "b.ts": /*js*/ `
          import { not_found } from "./a";
          console.log(not_found);
        `,
        "nf.ts": "",
      });

      const result = Bun.spawnSync({
        cmd: [bunExe(), "run", "b.ts"],
        cwd: dir,
        env: bunEnv,
        stdio: ["inherit", "pipe", "pipe"],
      });

      expect(result.stderr?.toString().trim()).toMatch(target_value);
      expect({
        exitCode: result.exitCode,
        stdout: result.stdout?.toString().trim(),
      }).toEqual({
        exitCode: 1,
        stdout: "",
      });
    });
});

test("js file type export", () => {
  const dir = tempDirWithFiles("type-export", {
    "a.js": "export {not_found};",
  });

  const result = Bun.spawnSync({
    cmd: [bunExe(), "a.js"],
    cwd: dir,
    env: bunEnv,
    stdio: ["inherit", "pipe", "pipe"],
  });
  expect(result.stderr?.toString().trim()).toInclude('error: "not_found" is not declared in this file');
  expect(result.exitCode).toBe(1);
});
test("js file type import", () => {
  const dir = tempDirWithFiles("type-import", {
    "b.js": "import {type_only} from './ts.ts';",
    "ts.ts": "export type type_only = 'type_only';",
  });
  const result = Bun.spawnSync({
    cmd: [bunExe(), "b.js"],
    cwd: dir,
    env: bunEnv,
    stdio: ["inherit", "pipe", "pipe"],
  });
  expect(result.stderr?.toString().trim()).toInclude("Export named 'type_only' not found in module '");
  expect(result.stderr?.toString().trim()).not.toInclude("Did you mean to import default?");
  expect(result.exitCode).toBe(1);
});
test("js file type import with default export", () => {
  const dir = tempDirWithFiles("type-import", {
    "b.js": "import {type_only} from './ts.ts';",
    "ts.ts": "export type type_only = 'type_only'; export default function type_only() {};",
  });
  const result = Bun.spawnSync({
    cmd: [bunExe(), "b.js"],
    cwd: dir,
    env: bunEnv,
    stdio: ["inherit", "pipe", "pipe"],
  });
  expect(result.stderr?.toString().trim()).toInclude("Export named 'type_only' not found in module '");
  expect(result.stderr?.toString().trim()).toInclude("Did you mean to import default?");
  expect(result.exitCode).toBe(1);
});

test("js file with through export", () => {
  const dir = tempDirWithFiles("type-import", {
    "b.js": "export {type_only} from './ts.ts';",
    "ts.ts": "export type type_only = 'type_only'; export default function type_only() {};",
  });
  const result = Bun.spawnSync({
    cmd: [bunExe(), "b.js"],
    cwd: dir,
    env: bunEnv,
    stdio: ["inherit", "pipe", "pipe"],
  });
  expect(result.stderr?.toString().trim()).toInclude("SyntaxError: export 'type_only' not found in './ts.ts'\n");
  expect(result.exitCode).toBe(1);
});

test("js file with through export 2", () => {
  const dir = tempDirWithFiles("type-import", {
    "b.js": "import {type_only} from './ts.ts'; export {type_only};",
    "ts.ts": "export type type_only = 'type_only'; export default function type_only() {};",
  });
  const result = Bun.spawnSync({
    cmd: [bunExe(), "b.js"],
    cwd: dir,
    env: bunEnv,
    stdio: ["inherit", "pipe", "pipe"],
  });
  expect(result.stderr?.toString().trim()).toInclude("SyntaxError: export 'type_only' not found in './ts.ts'\n");
  expect(result.exitCode).toBe(1);
});
