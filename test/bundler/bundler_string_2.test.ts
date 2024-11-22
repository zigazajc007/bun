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
