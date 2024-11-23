import { test, expect } from "bun:test";
import { readFileSync } from "fs";
import { bunExe, isWindows, tempDirWithFiles } from "harness";

// execute in bun & node, compare output
const file_cont = readFileSync(import.meta.dirname + "/bundler_string_2.fixture.txt", "utf-8");

const header_cont = new TextEncoder().encode(/*js*/ `
  function print(msg) {
    console.log(msg);
  };
`);

const tmpdir = tempDirWithFiles("bundler_string_2", {});
console.log(tmpdir);

const line_ending = isWindows ? "\r\n" : "\n";

let i = 0;
for (const testdef of file_cont.split("/*=")) {
  if (!testdef.trim()) continue;
  i += 1;
  const [tname_seg, tvalue_raw, expectnone] = testdef.split("*/");
  if (tvalue_raw == null) throw new Error("bad test: tvalue missing");
  const [tname, terr, expectnone2] = tname_seg.split(":-:");
  if (expectnone != null) throw new Error("bad test: " + tname);
  if (expectnone2 != null) throw new Error("bad test: " + tname);
  const req_eval = tname.includes("[c]");
  const req_todo = tname.includes("[todo]");

  let tvalue: string | Uint8Array = tvalue_raw;
  if (req_eval) {
    tvalue = new Function("", "return " + tvalue)();
  }
  if (typeof tvalue === "string") tvalue = new TextEncoder().encode(tvalue);
  let tdecoded: string | null;
  try {
    tdecoded = new TextDecoder().decode(tvalue);
  } catch (e) {
    tdecoded = null;
  }

  const tpath = "_" + i + ".js";
  await Bun.write(tmpdir + "/" + tpath, new Uint8Array([...header_cont, ...tvalue]));

  const testcb = async () => {
    // result in node
    const noderes = Bun.spawnSync({
      cmd: ["node", tpath],
      cwd: tmpdir,
      stdin: "pipe",
      stdout: "pipe",
      stderr: terr != null ? "pipe" : "inherit",
    });
    // result in bun
    const bunres = Bun.spawnSync({
      cmd: [bunExe(), tpath],
      cwd: tmpdir,
      stdin: "pipe",
      stdout: "pipe",
      stderr: terr != null ? "pipe" : "inherit",
    });
    // result from eval()
    let evalres: string | Error = "";
    if (tdecoded != null) {
      try {
        new Function("print", tdecoded)((msg: string) => (evalres += msg + line_ending));
      } catch (e) {
        evalres = e as Error;
      }
    }

    // expects
    if (terr == null) {
      // expect ok and same result
      expect(noderes.exitCode).toBe(0);
      expect(bunres.exitCode).toBe(0);
      if (tdecoded != null) expect(evalres).toBeTypeOf("string");
      const nodeprinted = noderes.stdout.toString("utf-8");
      const bunprinted = bunres.stdout.toString("utf-8");
      expect(bunprinted).toBe(nodeprinted);
      if (tdecoded != null) expect(bunprinted).toBe(evalres as string);
    } else {
      // expect error
      expect(noderes.exitCode).not.toBe(0);
      expect(bunres.exitCode).not.toBe(0);
      expect(evalres).toBeInstanceOf(Error);
      const nodeerrored = noderes.stdout.toString("utf-8");
      const bunerrored = bunres.stderr?.toString("utf-8");
      // console.log(nodeerrored, bunerrored, evalres);
      expect(bunerrored).toInclude(terr.trim());
    }
  };
  function syncExecPromise<T>(v: () => Promise<T>): { err: unknown; res: T | null } {
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
    return { err, res };
  }
  if (req_todo) {
    const result = syncExecPromise(testcb);
    if (result.err != null) {
      test.todo(tname);
    } else {
      test(tname, () => {
        throw new Error("test marked as todo, but it passed. remove todo flag.");
      });
    }
  } else {
    test(tname, testcb);
  }
}

// // prettier-ignore
// test("str 1", () => expect("abc").toMatchSnapshot());
// // prettier-ignore
// test("str 2", () => expect("abc\\").toMatchSnapshot());
// // prettier-ignore
// test("str 3", () => expect("abc\"").toMatchSnapshot());
// // prettier-ignore
// test("str 4", () => expect("1234567812345678\"").toMatchSnapshot());
// // prettier-ignore
// test("str 5", () => expect("123456781234567\"1").toMatchSnapshot());
// // prettier-ignore
// test("str 6", () => expect("abc\"").toMatchSnapshot());
// // prettier-ignore
// test("str 7", () => expect("\u{0}\u{1}\u{2}\u{3}\u{4}").toMatchSnapshot());

// // tagged template literal allows bad:
// const allowed_bads = [
//   "\\u",
//   "\\u1",
//   "\\u12",
//   "\\u123",
//   "\\u1234",
//   "\\u12345",
//   "\\u{",
//   "\\u{1",
//   "\\u{12",
//   "\\u{123",
//   "\\u{1234",
//   "\\u{12345",
//   "\\u{123456",
//   "\\u{1234567",
//   "\\u{12345678",
//   "\\u{123456789",
//   "\\u{12345678910",
//   "\\u{12345678910}",
//   "\\u{12345678910}1",
//   "\\x",
//   "\\x0",
//   "\\x01",
//   "\\x012",
//   "\\x0123",
//   "\\x01234",
//   "\\01",
//   "\\012",
//   "\\0123",
//   "\\01234",
// ];
// for (const allowed_bad of allowed_bads) {
//   // each of these is allowed in a tagged template literal, but disallowed in an untagged template literal
//   "`" + allowed_bad + "`";
// }
