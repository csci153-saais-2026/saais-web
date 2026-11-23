import { AccountSkeleton } from "@/components/features/loading-skeletons";
import { useEffect, useMemo, useState } from "react";
import { DataTablePanel } from "@/components/features/data-table-panel";
import { PageHeading } from "@/components/features/page-heading";
import { Button } from "@/components/ui/button";
import {
  apiClient,
  unwrapApiResult,
  type ApiSchema,
  type OperationQuery,
} from "@/lib/api";
import { AdminDepartmentDialog } from "./AdminDepartmentDialog";
import { AdminDepartmentDeleteDialog } from "./AdminDepartmentDeleteDialog";
import { AdminFacultyDeleteDialog } from "./AdminFacultyDeleteDialog";
import { AdminFacultyDialog } from "./AdminFacultyDialog";
import { RowActionsMenu } from "../shared/RowActionsMenu";
import { FACULTY_CATALOG_LIMIT } from "./admin-faculties-model";

type Faculty = ApiSchema<"Faculty">;
type Department = ApiSchema<"Department">;

const FACULTY_QUERY: OperationQuery<"listFaculties"> = {
  select: "id,name,code",
  order: "name.asc,id.asc",
  limit: FACULTY_CATALOG_LIMIT,
};

const DEPARTMENT_QUERY: OperationQuery<"listDepartments"> = {
  select: "id,faculty_id,name,code",
  order: "name.asc,id.asc",
  limit: FACULTY_CATALOG_LIMIT,
};

async function loadAllPages<T>(
  loadPage: (offset: number) => Promise<readonly T[]>,
): Promise<T[]> {
  const records: T[] = [];
  for (let offset = 0; ; offset += FACULTY_CATALOG_LIMIT) {
    const page = await loadPage(offset);
    records.push(...page);
    if (page.length < FACULTY_CATALOG_LIMIT) return records;
  }
}

export default function AdminFacultiesPage() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [reloadCount, setReloadCount] = useState(0);
  const [loadedRequest, setLoadedRequest] = useState(-1);
  const [requestError, setRequestError] = useState<{
    readonly request: number;
    readonly message: string;
  } | null>(null);
  const [facultyDialog, setFacultyDialog] = useState<
    Faculty | null | undefined
  >(undefined);
  const [deleteFaculty, setDeleteFaculty] = useState<Faculty | null>(null);
  const [departmentDialog, setDepartmentDialog] = useState<
    Department | null | undefined
  >(undefined);
  const [deleteDepartment, setDeleteDepartment] = useState<Department | null>(
    null,
  );
  const [savingFaculty, setSavingFaculty] = useState(false);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [deletingFacultyId, setDeletingFacultyId] = useState<string | null>(
    null,
  );
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      loadAllPages((offset) =>
        apiClient
          .GET("/rest/v1/faculty", {
            params: { query: { ...FACULTY_QUERY, offset } },
          })
          .then(unwrapApiResult),
      ),
      loadAllPages((offset) =>
        apiClient
          .GET("/rest/v1/department", {
            params: { query: { ...DEPARTMENT_QUERY, offset } },
          })
          .then(unwrapApiResult),
      ),
    ])
      .then(([nextFaculties, nextDepartments]) => {
        if (!active) return;
        setFaculties(nextFaculties);
        setDepartments(nextDepartments);
        setRequestError(null);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setRequestError({
          request: reloadCount,
          message:
            requestError instanceof Error
              ? requestError.message
              : "The faculty and department catalogs could not be loaded.",
        });
      })
      .finally(() => {
        if (active) setLoadedRequest(reloadCount);
      });

    return () => {
      active = false;
    };
  }, [reloadCount]);

  const loading = loadedRequest !== reloadCount;
  const error =
    requestError?.request === reloadCount ? requestError.message : null;
  const departmentCounts = useMemo(() => {
    const departmentCounts = new Map<string, number>();
    for (const department of departments) {
      departmentCounts.set(
        department.faculty_id,
        (departmentCounts.get(department.faculty_id) ?? 0) + 1,
      );
    }
    return departmentCounts;
  }, [departments]);
  const facultiesById = useMemo(
    () => new Map(faculties.map((faculty) => [faculty.id, faculty])),
    [faculties],
  );

  const facultyColumns = [
    {
      header: "Faculty",
      cell: (faculty: Faculty) => (
        <span className="block max-w-72 truncate" title={faculty.name}>
          {faculty.name}
        </span>
      ),
    },
    {
      header: "Code",
      className: "font-mono",
      cell: (faculty: Faculty) => faculty.code || "—",
    },
    {
      header: "Departments",
      numeric: true,
      cell: (faculty: Faculty) => departmentCounts.get(faculty.id) ?? 0,
    },
    {
      header: "Actions",
      headerContent: <span className="sr-only">Actions</span>,
      className: "w-10 text-right",
      cell: (faculty: Faculty) => (
        <RowActionsMenu
          label={faculty.name}
          onEdit={() => setFacultyDialog(faculty)}
          onDelete={() => setDeleteFaculty(faculty)}
        />
      ),
    },
  ];
  const departmentColumns = [
    {
      header: "Department",
      cell: (department: Department) => (
        <span className="block max-w-72 truncate" title={department.name}>
          {department.name}
        </span>
      ),
    },
    {
      header: "Code",
      className: "font-mono",
      cell: (department: Department) => department.code || "—",
    },
    {
      header: "Parent faculty",
      cell: (department: Department) => {
        const name =
          facultiesById.get(department.faculty_id)?.name ?? "Unknown faculty";
        return (
          <span className="block max-w-72 truncate" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      header: "Actions",
      headerContent: <span className="sr-only">Actions</span>,
      className: "w-10 text-right",
      cell: (department: Department) => (
        <RowActionsMenu
          label={department.name}
          onEdit={() => setDepartmentDialog(department)}
          onDelete={() => setDeleteDepartment(department)}
        />
      ),
    },
  ];

  return (
    <div className="grid gap-2">
      <PageHeading
        title="Faculties and departments"
        subtitle="Maintain the institutional faculty and department hierarchy."
        className="mb-4"
        actions={
          <>
            <Button
              onClick={() => setDepartmentDialog(null)}
              disabled={faculties.length === 0}
            >
              Add department
            </Button>
            <Button
              onClick={() => setFacultyDialog(null)}
              disabled={loading || Boolean(error)}
            >
              Add faculty
            </Button>
          </>
        }
      />

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-card px-4 py-3"
        >
          <p className="text-sm">{error}</p>
          <Button
            className="mt-2"
            variant="outline"
            size="sm"
            onClick={() => setReloadCount((count) => count + 1)}
          >
            Try again
          </Button>
        </div>
      )}

      <AccountSkeleton
        id="admin-faculties-1"
        loading={loading}
        label="Loading faculties…"
      >
        <DataTablePanel
          spacious
          title="Faculties"
          description="Institutional colleges and divisions, with department totals."
          columns={facultyColumns}
          rows={!loading && !error ? faculties : []}
          rowKey={(faculty) => faculty.id}
          empty={
            loading
              ? "Loading faculties…"
              : error
                ? "Faculties are unavailable."
                : "No faculties have been added to the catalog."
          }
        />
      </AccountSkeleton>

      <AccountSkeleton
        id="admin-faculties-2"
        loading={loading}
        label="Loading departments…"
      >
        <DataTablePanel
          spacious
          title="Departments"
          description="Academic departments and their parent faculties."
          columns={departmentColumns}
          rows={!loading && !error ? departments : []}
          rowKey={(department) => department.id}
          empty={
            loading
              ? "Loading departments…"
              : error
                ? "Departments are unavailable."
                : "No departments have been added to the catalog."
          }
        />
      </AccountSkeleton>

      {deleteFaculty && (
        <AdminFacultyDeleteDialog
          faculty={deleteFaculty}
          departmentCount={departmentCounts.get(deleteFaculty.id) ?? 0}
          onOpenChange={(open) => {
            if (!open && deletingFacultyId !== deleteFaculty.id) {
              setDeleteFaculty(null);
            }
          }}
          onConfirm={async (id) => {
            setDeletingFacultyId(id);
            try {
              await unwrapApiResult(
                await apiClient.DELETE("/functions/v1/catalog/faculty/{id}", {
                  params: { path: { id } },
                }),
              );
              setDeleteFaculty(null);
              setReloadCount((count) => count + 1);
            } finally {
              setDeletingFacultyId(null);
            }
          }}
        />
      )}

      {deleteDepartment && (
        <AdminDepartmentDeleteDialog
          department={deleteDepartment}
          facultyName={
            facultiesById.get(deleteDepartment.faculty_id)?.name ??
            "an unknown faculty"
          }
          onOpenChange={(open) => {
            if (!open && deletingDepartmentId !== deleteDepartment.id) {
              setDeleteDepartment(null);
            }
          }}
          onConfirm={async (id) => {
            setDeletingDepartmentId(id);
            try {
              await unwrapApiResult(
                await apiClient.DELETE(
                  "/functions/v1/catalog/department/{id}",
                  {
                    params: { path: { id } },
                  },
                ),
              );
              setDeleteDepartment(null);
              setReloadCount((count) => count + 1);
            } finally {
              setDeletingDepartmentId(null);
            }
          }}
        />
      )}

      {facultyDialog !== undefined && (
        <AdminFacultyDialog
          key={facultyDialog?.id ?? "new"}
          faculty={facultyDialog}
          onOpenChange={(open) => {
            if (!open && !savingFaculty) setFacultyDialog(undefined);
          }}
          onSubmit={async (request) => {
            setSavingFaculty(true);
            try {
              if (facultyDialog) {
                await unwrapApiResult(
                  await apiClient.PATCH("/functions/v1/catalog/faculty/{id}", {
                    params: { path: { id: facultyDialog.id } },
                    body: request,
                  }),
                );
              } else {
                await unwrapApiResult(
                  await apiClient.POST("/functions/v1/catalog/faculty", {
                    body: request,
                  }),
                );
              }
              setFacultyDialog(undefined);
              setReloadCount((count) => count + 1);
            } finally {
              setSavingFaculty(false);
            }
          }}
        />
      )}
      {departmentDialog !== undefined && (
        <AdminDepartmentDialog
          key={departmentDialog?.id ?? "new"}
          department={departmentDialog}
          faculties={faculties}
          onOpenChange={(open) => {
            if (!open && !savingDepartment) setDepartmentDialog(undefined);
          }}
          onSubmit={async (request) => {
            setSavingDepartment(true);
            try {
              if (departmentDialog) {
                await unwrapApiResult(
                  await apiClient.PATCH(
                    "/functions/v1/catalog/department/{id}",
                    {
                      params: { path: { id: departmentDialog.id } },
                      body: request,
                    },
                  ),
                );
              } else {
                await unwrapApiResult(
                  await apiClient.POST("/functions/v1/catalog/department", {
                    body: request,
                  }),
                );
              }
              setDepartmentDialog(undefined);
              setReloadCount((count) => count + 1);
            } finally {
              setSavingDepartment(false);
            }
          }}
        />
      )}
    </div>
  );
}
