import { useEffect, useState } from "react";
import type { ApiSchema } from "@/lib/api";
import { getAdviserDashboard, getSchoolTerms } from "./adviser-dashboard.api";

type DashboardState = {
  key: string;
  report: ApiSchema<"AdviserDashboardReport"> | null;
  terms: ApiSchema<"SchoolTerm">[];
  error: string | null;
  loading: boolean;
};

export function useAdviserDashboard(
  userId: string | undefined,
  termId: string,
  revision: number,
) {
  const key = JSON.stringify([userId, termId, revision]);
  const [state, setState] = useState<DashboardState>({
    key: "",
    report: null,
    terms: [],
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    if (!userId)
      return () => {
        active = false;
      };
    void Promise.all([
      getAdviserDashboard(termId || undefined),
      getSchoolTerms(),
    ])
      .then(([report, terms]) => {
        if (report.adviser_id !== userId)
          throw new Error(
            "The dashboard report does not match the signed-in adviser.",
          );
        if (active)
          setState({ key, report, terms, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            key,
            report: null,
            terms: [],
            error:
              error instanceof Error
                ? error.message
                : "Unable to load the dashboard.",
            loading: false,
          });
      });
    return () => {
      active = false;
    };
  }, [userId, termId, key]);

  return state.key === key
    ? state
    : { key, report: null, terms: [], error: null, loading: true };
}
