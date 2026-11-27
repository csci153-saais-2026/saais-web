/** VSU numeric grades: 1.00 to 3.00 passes and 5.00 fails. */
export const isOnGradeScale = (grade: number) =>
  grade === 5 || (grade >= 1 && grade <= 3 && (grade * 4) % 1 === 0);
