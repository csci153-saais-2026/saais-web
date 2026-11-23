import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTablePanel } from "@/components/features/data-table-panel";
import { FilterBar } from "@/components/features/filter-bar";
import { PageHeading } from "@/components/features/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { RowActionsMenu } from "../shared/RowActionsMenu";
import { AdminProgramDialog } from "./AdminProgramDialog";
import { AdminProgramDeleteDialog } from "./AdminProgramDeleteDialog";
import {
  apiClient,
  parseContentRange,
  unwrapApiResult,
  type ApiSchema,
} from "@/lib/api";
import {
  buildProgramListQuery,
  PROGRAM_PAGE_SIZE,
  type ProgramStatusFilter,
} from "./admin-programs-model";

type Program = ApiSchema<"Program">;
type Department = Pick<ApiSchema<"Department">, "id" | "name" | "faculty_id">;
type Faculty = Pick<ApiSchema<"Faculty">, "id" | "name">;

const ORGANIZATION_CATALOG_PAGE_SIZE = 1000;

async function loadAllPages<T>(
  loadPage: (offset: number) => Promise<readonly T[]>,
): Promise<T[]> {
  const records: T[] = [];
  for (let offset = 0; ; offset += ORGANIZATION_CATALOG_PAGE_SIZE) {
    const page = await loadPage(offset);
    records.push(...page);
    if (page.length < ORGANIZATION_CATALOG_PAGE_SIZE) return records;
  }
}

const STATUS_FILTERS = [
  { value: "all", label: "All records" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

export default function AdminProgramsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProgramStatusFilter>("all");
  const [offset, setOffset] = useState(0);
  const [reloadCount, setReloadCount] = useState(0);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [rangeTotal, setRangeTotal] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const [requestError, setRequestError] = useState<{
    readonly key: string;
    readonly message: string;
  } | null>(null);
  const [loadedCatalogRequest, setLoadedCatalogRequest] = useState(-1);
  const [catalogErrorState, setCatalogErrorState] = useState<{
    readonly key: number;
    readonly message: string;
  } | null>(null);
  const [catalogReloadCount, setCatalogReloadCount] = useState(0);
  const [dialogProgram, setDialogProgram] = useState<
    Program | null | undefined
  >(undefined);
  const [deleteProgram, setDeleteProgram] = useState<Program | null>(null);
  const [dialogMutationPending, setDialogMutationPending] = useState(false);
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(
    null,
  );

  const { query, error: searchError } = useMemo(
    () => buildProgramListQuery(search, status, offset),
    [offset, search, status],
  );
  const requestKey = `${JSON.stringify(query)}:${reloadCount}`;
  const loading = Boolean(query) && loadedRequestKey !== requestKey;
  const error = requestError?.key === requestKey ? requestError.message : null;
  const hasNextPage =
    rangeTotal !== null
      ? offset + PROGRAM_PAGE_SIZE < rangeTotal
      : programs.length === PROGRAM_PAGE_SIZE;
  const catalogsLoaded = loadedCatalogRequest === catalogReloadCount;
  const catalogError =
    catalogErrorState?.key === catalogReloadCount
      ? catalogErrorState.message
      : null;

  useEffect(() => {
    let active = true;
    void Promise.all([
      loadAllPages((offset) =>
        apiClient
          .GET("/rest/v1/department", {
            params: {
              query: {
                select: "id,name,faculty_id",
                order: "name.asc,id.asc",
                limit: ORGANIZATION_CATALOG_PAGE_SIZE,
                offset,
              },
            },
          })
          .then(unwrapApiResult),
      ),
      loadAllPages((offset) =>
        apiClient
          .GET("/rest/v1/faculty", {
            params: {
              query: {
                select: "id,name",
                order: "name.asc,id.asc",
                limit: ORGANIZATION_CATALOG_PAGE_SIZE,
                offset,
              },
            },
          })
          .then(unwrapApiResult),
      ),
    ])
      .then(([nextDepartments, nextFaculties]) => {
        if (!active) return;
        setDepartments(nextDepartments);
        setFaculties(nextFaculties);
        setLoadedCatalogRequest(catalogReloadCount);
      })
      .catch((catalogRequestError: unknown) => {
        if (!active) return;
        setCatalogErrorState({
          key: catalogReloadCount,
          message:
            catalogRequestError instanceof Error
              ? catalogRequestError.message
              : "Faculty and department information could not be loaded.",
        });
        setLoadedCatalogRequest(catalogReloadCount);
      });

    return () => {
      active = false;
    };
  }, [catalogReloadCount]);

  useEffect(() => {
    if (!query) return;

    let active = true;
    void apiClient
      .GET("/rest/v1/program", { params: { query } })
      .then((result) => {
        const nextPrograms = unwrapApiResult(result);
        if (!active) return;
        setPrograms(nextPrograms);
        setRangeTotal(
          parseContentRange(result.response.headers.get("Content-Range"))
            ?.total ?? null,
        );
        setRequestError(null);
      })
      .catch((programRequestError: unknown) => {
        if (!active) return;
        setRequestError({
          key: requestKey,
          message:
            programRequestError instanceof Error
              ? programRequestError.message
              : "The program catalog could not be loaded.",
        });
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey);
      });

    return () => {
      active = false;
    };
  }, [query, requestKey]);

  const retryPrograms = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  async function saveProgram(
    program: Program | null,
    request: Pick<
      ApiSchema<"ProgramInsert">,
      "code" | "name" | "nominal_duration" | "status" | "department_id"
    >,
  ) {
    setDialogMutationPending(true);
    try {
      if (program) {
        await unwrapApiResult(
          await apiClient.PATCH("/functions/v1/catalog/program/{id}", {
            params: { path: { id: program.id } },
            body: request,
          }),
        );
      } else {
        await unwrapApiResult(
          await apiClient.POST("/functions/v1/catalog/program", {
            body: request,
          }),
        );
      }

      setDialogProgram(undefined);
      retryPrograms();
    } finally {
      setDialogMutationPending(false);
    }
  }

  async function removeProgram(id: string) {
    setDeletingProgramId(id);
    try {
      await unwrapApiResult(
        await apiClient.DELETE("/functions/v1/catalog/program/{id}", {
          params: { path: { id } },
        }),
      );
      setDeleteProgram(null);
      retryPrograms();
    } finally {
      setDeletingProgramId(null);
    }
  }

  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );
  const facultiesById = useMemo(
    () => new Map(faculties.map((faculty) => [faculty.id, faculty])),
    [faculties],
  );

  function updateSearch(value: string) {
    setOffset(0);
    setSearch(value);
  }

  function updateStatus(value: string) {
    if (
      value !== "all" &&
      value !== "active" &&
      value !== "inactive" &&
      value !== "archived"
    ) {
      return;
    }
    setOffset(0);
    setStatus(value);
  }

  const columns = [
    {
      header: "Code",
      className: "font-mono font-semibold",
      cell: (program: Program) => program.code,
    },
    {
      header: "Program",
      cell: (program: Program) => (
        <div>
          <p className="font-medium">{program.name}</p>
          <p className="text-xs text-muted-foreground">
            {program.nominal_duration} years
          </p>
        </div>
      ),
    },
    {
      header: "Department",
      cell: (program: Program) => {
        const department = departmentsById.get(program.department_id);
        if (!department) return "Unknown department";
        return (
          <div>
            <p>{department.name}</p>
            <p className="text-xs text-muted-foreground">
              {facultiesById.get(department.faculty_id)?.name ??
                "Unknown faculty"}
            </p>
          </div>
        );
      },
    },
    {
      header: "Status",
      cell: (program: Program) => (
        <StatusBadge
          status={program.status === "inactive" ? "disabled" : program.status}
        >
          {program.status[0]!.toUpperCase() + program.status.slice(1)}
        </StatusBadge>
      ),
    },
    {
      header: "Actions",
      headerContent: <span className="sr-only">Actions</span>,
      className: "w-10 text-right",
      cell: (program: Program) => (
        <RowActionsMenu
          label={program.name}
          editDisabled={!catalogsLoaded || Boolean(catalogError)}
          onEdit={() => setDialogProgram(program)}
          onDelete={() => setDeleteProgram(program)}
        />
      ),
    },
  ];

  return (
    <div className="grid gap-2">
      <PageHeading
        title="Programs"
        subtitle="Each degree program owns its curriculum versions."
        className="mb-6"
        actions={
          <Button
            disabled={!catalogsLoaded || Boolean(catalogError)}
            onClick={() => setDialogProgram(null)}
          >
            New program
          </Button>
        }
      />

      {catalogError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-card px-4 py-3"
        >
          <p className="text-sm">{catalogError}</p>
          <Button
            className="mt-2"
            variant="outline"
            size="sm"
            onClick={() => setCatalogReloadCount((count) => count + 1)}
          >
            Retry organization details
          </Button>
        </div>
      )}

      <FilterBar
        searchLabel="Search records"
        searchPlaceholder="Search name, code, or details"
        search={search}
        onSearchChange={updateSearch}
        filterLabel="Filter"
        filterOptions={STATUS_FILTERS}
        filter={status}
        onFilterChange={updateStatus}
      />

      {searchError && (
        <p role="alert" className="-mt-3 mb-3 text-sm text-destructive">
          {searchError}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-destructive/30 bg-card px-4 py-3"
        >
          <p className="text-sm">{error}</p>
          <Button
            className="mt-2"
            variant="outline"
            size="sm"
            onClick={retryPrograms}
          >
            Try again
          </Button>
        </div>
      )}

      <DataTablePanel
        spacious
        title="Degree programs"
        description="Codes and names must be unique."
        columns={columns}
        rows={loading || error || searchError ? [] : programs}
        rowKey={(program) => program.id}
        empty={
          loading
            ? "Loading programs…"
            : searchError
              ? "Enter a valid search to view programs."
              : error
                ? "Programs are unavailable."
                : search.trim() || status !== "all"
                  ? "No programs match your search."
                  : "No programs have been added to the catalog."
        }
        footer={
          loading
            ? undefined
            : `Page ${Math.floor(offset / PROGRAM_PAGE_SIZE) + 1}${
                rangeTotal === null ? "" : ` · ${rangeTotal} programs`
              }`
        }
      />

      <nav
        aria-label="Program catalog pages"
        className="flex items-center justify-between"
      >
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0 || loading}
          onClick={() =>
            setOffset((current) => Math.max(0, current - PROGRAM_PAGE_SIZE))
          }
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {loading
            ? "Loading programs…"
            : `Page ${Math.floor(offset / PROGRAM_PAGE_SIZE) + 1}`}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={
            !hasNextPage || loading || Boolean(error) || Boolean(searchError)
          }
          onClick={() => setOffset((current) => current + PROGRAM_PAGE_SIZE)}
        >
          Next
        </Button>
      </nav>

      {!catalogsLoaded && (
        <span className="sr-only" aria-live="polite">
          Loading faculty and department details…
        </span>
      )}

      {dialogProgram !== undefined && (
        <AdminProgramDialog
          key={dialogProgram?.id ?? "new"}
          program={dialogProgram}
          faculties={faculties}
          departments={departments}
          catalogsLoading={!catalogsLoaded || Boolean(catalogError)}
          onOpenChange={(open) => {
            if (!open && !dialogMutationPending) setDialogProgram(undefined);
          }}
          onSubmit={(request) => saveProgram(dialogProgram, request)}
        />
      )}
      {deleteProgram && (
        <AdminProgramDeleteDialog
          program={deleteProgram}
          onOpenChange={(open) => {
            if (!open && deletingProgramId !== deleteProgram.id) {
              setDeleteProgram(null);
            }
          }}
          onConfirm={removeProgram}
        />
      )}
    </div>
  );
}
