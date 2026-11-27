import { operationsFor } from "../_shared/http.ts";
export const creditTransferOperations = operationsFor("students").filter(
  (operation) => !operation.usesAcademicRpc,
);
