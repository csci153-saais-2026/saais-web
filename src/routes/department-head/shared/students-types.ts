/** Directory row shown by the Students and Adviser assignments pages. */
export type DirectoryStudent = {
  id: string;
  name: string;
  studentNumber: string;
  email: string;
  curriculum: string;
  yearStanding: string;
  adviser: string;
  adviserSince?: string;
  previousAdviser?: string;
  scheduledAssignment?: {
    adviser: string;
    effectiveDate: string;
    reason: string;
  };
};
