import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/auth-context";
import {
  createDepartmentPdf,
  type DepartmentPdfDocument,
} from "./department-pdf";
import { loadDepartmentPdfMetadata } from "./department-pdf-metadata";
import { useDepartmentHeadQueryKey } from "./use-dh-query-key";

type Preview = {
  document: DepartmentPdfDocument;
  scope: string;
  url?: string;
  error: boolean;
};

/** Prepare one export and release its browser URL when the selection changes. */
export function useDepartmentPdfUrl(document: DepartmentPdfDocument | null): {
  url: string | undefined;
  error: boolean;
} {
  const auth = useContext(AuthContext);
  const departmentId = auth?.profile?.department_id ?? undefined;
  const scope = JSON.stringify([
    ...useDepartmentHeadQueryKey(["department-head", "pdf"]),
    departmentId,
  ]);
  const [selection, setSelection] = useState({ document, scope });
  const [preview, setPreview] = useState<Preview | null>(null);

  // A document belongs to the scope in which it was selected. A new account or
  // scope must select a new document instead of relabelling the previous data.
  if (selection.document !== document) setSelection({ document, scope });
  const selectedHere =
    selection.document === document && selection.scope === scope;
  const current =
    preview?.document === document && preview.scope === scope ? preview : null;

  useEffect(() => {
    if (!document || !selectedHere) return;
    let active = true;
    let objectUrl: string | undefined;

    const build = async () => {
      const department = await loadDepartmentPdfMetadata(departmentId);
      if (!active) return;
      const blob = await createDepartmentPdf(document, department);
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setPreview({ document, scope, url: objectUrl, error: false });
    };

    void build().catch(() => {
      if (active) setPreview({ document, scope, error: true });
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document, departmentId, scope, selectedHere]);

  return {
    url: document && selectedHere ? current?.url : undefined,
    error: Boolean(document && (!selectedHere || current?.error)),
  };
}
