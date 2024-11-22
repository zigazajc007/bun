import { test, expect } from "bun:test";

// execute in bun & node, compare output

// prettier-ignore
test("str 1", () => expect("abc").toMatchSnapshot());
// prettier-ignore
test("str 2", () => expect("abc\\").toMatchSnapshot());
// prettier-ignore
test("str 3", () => expect("abc\"").toMatchSnapshot());
// prettier-ignore
test("str 4", () => expect("1234567812345678\"").toMatchSnapshot());
// prettier-ignore
test("str 5", () => expect("123456781234567\"1").toMatchSnapshot());
// prettier-ignore
test("str 6", () => expect("abc\"").toMatchSnapshot());
// prettier-ignore
test("str 7", () => expect("\u{0}\u{1}\u{2}\u{3}\u{4}").toMatchSnapshot());

// tagged template literal allows bad:
const allowed_bads = [
  "\\u",
  "\\u1",
  "\\u12",
  "\\u123",
  "\\u1234",
  "\\u12345",
  "\\u{",
  "\\u{1",
  "\\u{12",
  "\\u{123",
  "\\u{1234",
  "\\u{12345",
  "\\u{123456",
  "\\u{1234567",
  "\\u{12345678",
  "\\u{123456789",
  "\\u{12345678910",
  "\\u{12345678910}",
  "\\u{12345678910}1",
  "\\x",
  "\\x0",
  "\\x01",
  "\\x012",
  "\\x0123",
  "\\x01234",
  "\\01",
  "\\012",
  "\\0123",
  "\\01234",
];
for (const allowed_bad of allowed_bads) {
  // each of these is allowed in a tagged template literal, but disallowed in an untagged template literal
  "`" + allowed_bad + "`";
}
