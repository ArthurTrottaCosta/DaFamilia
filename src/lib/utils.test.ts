import { describe, it, expect } from "vitest";
import { normalizePhone, searchText, vCard, localDateInput } from "./utils";
describe("phone safety", () => {
  it("normalizes Brazilian mobile and landline", () => {
    expect(normalizePhone("(11) 99999-1234")).toBe("+5511999991234");
    expect(normalizePhone("1133332222")).toBe("+551133332222");
  });
  it("preserves international prefix", () =>
    expect(normalizePhone("+1 202 555 0123")).toBe("+12025550123"));
  it("rejects invalid number", () =>
    expect(() => normalizePhone("123")).toThrow());
});
it("finds accent insensitive names", () =>
  expect(searchText("Saúde Lúcia")).toBe("saude lucia"));
it("escapes vcard injection", () => {
  const card = vCard("Nome\nTEL:999;+teste", "+5511999991234");
  expect(card).toContain("Nome\\nTEL:999\\;+teste");
  expect(card.split("\r\n").filter((l) => l.startsWith("TEL:"))).toHaveLength(
    0,
  );
});
it("keeps local calendar input consistent", () => {
  const d = new Date(2026, 0, 2, 23, 45);
  expect(localDateInput(d)).toBe("2026-01-02T23:45");
});
