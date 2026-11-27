import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, isApiClientError, unwrapApiResult } from "@/lib/api";
import { useDepartmentHeadQueryKey } from "../shared/use-dh-query-key";
import { getTransfers, TRANSFER_QUERY_KEY } from "./transfers-api";

export const useTransfers = () =>
  useQuery({
    queryKey: useDepartmentHeadQueryKey(TRANSFER_QUERY_KEY),
    queryFn: getTransfers,
  });

export function useDecideTransfer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "approved" | "rejected";
      note: string;
    }) =>
      unwrapApiResult(
        await apiClient.POST(
          "/functions/v1/curriculum-transfers/{transfer_id}/decision",
          {
            params: { path: { transfer_id: id } },
            body:
              decision === "approved"
                ? { decision, ...(note ? { decision_note: note } : {}) }
                : { decision, decision_note: note },
          },
        ),
      ),
    onError: (error) => {
      // Someone else already decided it: drop the stale request.
      if (isApiClientError(error) && error.isConflict)
        return client.invalidateQueries({ queryKey: TRANSFER_QUERY_KEY });
    },
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: TRANSFER_QUERY_KEY }),
        client.invalidateQueries({ queryKey: ["department-head", "students"] }),
      ]),
  });
}
