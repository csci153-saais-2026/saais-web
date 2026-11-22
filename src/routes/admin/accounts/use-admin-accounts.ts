import { useQuery } from "@tanstack/react-query";
import type { AccountQuery } from "./admin-accounts-model";
import { listAdminAccounts } from "./admin-accounts.api";

export function useAdminAccounts(query: AccountQuery) {
  const accountsQuery = useQuery({
    queryKey: ["admin", "accounts", query],
    queryFn: ({ signal }) => listAdminAccounts(query, signal),
  });

  return {
    accounts: accountsQuery.data ?? [],
    error:
      accountsQuery.error instanceof Error
        ? accountsQuery.error.message
        : accountsQuery.error
          ? "Accounts could not be loaded."
          : null,
    loading: accountsQuery.isPending || accountsQuery.isFetching,
    reload: accountsQuery.refetch,
  };
}
