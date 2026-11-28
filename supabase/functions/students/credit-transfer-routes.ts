import contract from "../_shared/contract.json" with { type: "json" };

export const creditTransferOperations = contract.operations.filter(
  (operation) => operation.path.startsWith("/functions/v1/students/"),
);
