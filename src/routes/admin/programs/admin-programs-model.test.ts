import { describe, expect, it } from "vitest";
import {
  buildProgramListQuery,
  PROGRAM_PAGE_SIZE,
  PROGRAM_SEARCH_MAX_LENGTH,
  validateProgramForm,
  type ProgramFormValues,
} from "./admin-programs-model";

describe("buildProgramListQuery", () => {
  it("uses a safe projection and bounded stable pagination", () => {
    expect(buildProgramListQuery("", "all", 0)).toEqual({
      query: {
        select: "id,code,name,nominal_duration,status,department_id",
        order: "name.asc,id.asc",
        limit: PROGRAM_PAGE_SIZE,
        offset: 0,
      },
      error: null,
    });
  });

  it("adds server-side search and lifecycle filters", () => {
    expect(buildProgramListQuery("Computer Science", "active", 20)).toEqual({
      query: {
        select: "id,code,name,nominal_duration,status,department_id",
        order: "name.asc,id.asc",
        limit: PROGRAM_PAGE_SIZE,
        offset: 20,
        or: "(code.ilike.%Computer Science%,name.ilike.%Computer Science%)",
        status: "eq.active",
      },
      error: null,
    });
  });

  it("rejects search text that could alter the PostgREST filter expression", () => {
    expect(buildProgramListQuery("CS),status.eq.active,(", "all", 0)).toEqual({
      query: null,
      error:
        "Search cannot include commas, parentheses, or control characters.",
    });
  });

  it("rejects searches longer than the contract limit", () => {
    expect(
      buildProgramListQuery(
        "x".repeat(PROGRAM_SEARCH_MAX_LENGTH + 1),
        "all",
        0,
      ),
    ).toEqual({
      query: null,
      error: `Search must be ${PROGRAM_SEARCH_MAX_LENGTH} characters or fewer.`,
    });
  });

  describe("validateProgramForm", () => {
    const faculties = [{ id: "faculty-1" }];
    const departments = [
      { id: "department-1", faculty_id: "faculty-1" },
      { id: "department-2", faculty_id: "faculty-2" },
    ];
    const validValues: ProgramFormValues = {
      code: " BSCS ",
      name: " Computer Science ",
      duration: "4",
      facultyId: "faculty-1",
      departmentId: "department-1",
      status: "active",
    };

    it("accepts a complete program with its selected faculty relationship", () => {
      expect(validateProgramForm(validValues, departments, faculties)).toEqual(
        {},
      );
    });

    it("validates required fields, duration, and faculty-department consistency", () => {
      expect(
        validateProgramForm(
          {
            ...validValues,
            code: "x",
            name: "No",
            duration: "0",
            departmentId: "department-2",
          },
          departments,
          faculties,
        ),
      ).toEqual({
        code: "Enter a program code between 2 and 250 characters.",
        name: "Enter a program name between 3 and 250 characters.",
        duration: "Enter a valid duration of at least 1 year.",
        departmentId: "Choose a department in the selected faculty.",
      });
    });
  });
});
