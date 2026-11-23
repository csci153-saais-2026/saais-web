import { apiClient, unwrapApiResult, type ApiSchema } from "@/lib/api";
import type { AccountQuery } from "./admin-accounts-model";

export async function listAdminAccounts(
  query: AccountQuery,
  signal?: AbortSignal,
) {
  return unwrapApiResult(
    await apiClient.GET("/functions/v1/accounts", {
      params: { query },
      signal,
    }),
  );
}

export async function inviteAdminAccount(body: ApiSchema<"InviteRequest">) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/auth/invite", { body }),
  );
}

export async function updateAdminAccount(
  profileId: string,
  body: ApiSchema<"AdminProfileUpdate">,
) {
  return unwrapApiResult(
    await apiClient.PATCH("/functions/v1/accounts/{profile_id}", {
      params: { path: { profile_id: profileId } },
      body,
    }),
  );
}

export async function resendAdminInvitation(profileId: string) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/accounts/{profile_id}/resend-invite", {
      params: { path: { profile_id: profileId } },
    }),
  );
}

export async function revokeAdminInvitation(profileId: string) {
  return unwrapApiResult(
    await apiClient.POST("/functions/v1/accounts/{profile_id}/revoke-invite", {
      params: { path: { profile_id: profileId } },
    }),
  );
}
