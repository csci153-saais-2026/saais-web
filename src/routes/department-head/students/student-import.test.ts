import { describe, expect, it } from "vitest";
import { readImportLines } from "./student-import";

const header =
  "student_number,full_name,email,program,curriculum,adviser_email";
const row = "1,Name,a@b.c,BSCS,2024,x@y.z";

describe("department head student import file", () => {
  it("keeps file row numbers across blank lines", () => {
    const lines = readImportLines(`${header}\n\n${row}\n\n\n${row}\n`);
    expect(lines.map((line) => line.rowNumber)).toEqual([3, 6]);
  });

  it("rejects more than 500 student rows", () => {
    expect(() =>
      readImportLines([header, ...Array(501).fill(row)].join("\n")),
    ).toThrow("more than 500");
  });
});
