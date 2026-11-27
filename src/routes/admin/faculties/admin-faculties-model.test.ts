import { describe, expect, it } from "vitest";
import {
  buildDepartmentRequest,
  buildFacultyRequest,
  validateDepartmentForm,
  validateFacultyForm,
} from "./admin-faculties-model";

const faculties = [{ id: "faculty-1" }];

describe("admin faculties form model", () => {
  it("requires a valid name and accepts an optional code", () => {
    expect(validateFacultyForm({ name: " ", code: "" })).toEqual({
      name: "Enter a name between 2 and 250 characters.",
    });
    expect(
      validateFacultyForm({ name: " Faculty of Science ", code: "" }),
    ).toEqual({});
  });

  it("enforces the catalog code limit", () => {
    expect(
      validateFacultyForm({ name: "Faculty", code: "x".repeat(51) }).code,
    ).toBe("Enter a code of 50 characters or fewer.");
  });

  it("requires a department parent from the faculty catalog", () => {
    expect(
      validateDepartmentForm(
        { name: "Computer Science", code: "", facultyId: "missing" },
        faculties,
      ),
    ).toEqual({ facultyId: "Select a faculty." });
    expect(
      validateDepartmentForm(
        { name: "Computer Science", code: "", facultyId: "faculty-1" },
        faculties,
      ),
    ).toEqual({});
  });

  it("trims form values and represents an omitted code as null", () => {
    expect(buildFacultyRequest({ name: " Faculty ", code: " F " })).toEqual({
      name: "Faculty",
      code: "F",
    });
    expect(
      buildDepartmentRequest({
        name: " Department ",
        code: "",
        facultyId: "faculty-1",
      }),
    ).toEqual({
      faculty_id: "faculty-1",
      name: "Department",
      code: null,
    });
  });
});
