import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inviteAdminAccount,
  resendAdminInvitation,
  revokeAdminInvitation,
  updateAdminAccount,
} from "./admin-accounts.api";

export function useAdminAccountMutations() {
  const client = useQueryClient();
  const refreshAccounts = () =>
    client.invalidateQueries({ queryKey: ["admin", "accounts"] });

  return {
    invite: useMutation({
      mutationFn: inviteAdminAccount,
      onSuccess: refreshAccounts,
    }),
    update: useMutation({
      mutationFn: ({
        profileId,
        body,
      }: {
        profileId: string;
        body: Parameters<typeof updateAdminAccount>[1];
      }) => updateAdminAccount(profileId, body),
      onSuccess: refreshAccounts,
    }),
    resend: useMutation({
      mutationFn: resendAdminInvitation,
      onSuccess: refreshAccounts,
    }),
    revoke: useMutation({
      mutationFn: revokeAdminInvitation,
      onSuccess: refreshAccounts,
    }),
  };
}
