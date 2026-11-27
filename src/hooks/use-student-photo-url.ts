import { useEffect, useState } from "react";
import {
  getSupabaseClient,
  resolveSaaisEnvConfig,
} from "@/lib/supabase/client";

const PREFIXES = [
  "/storage/v1/object/authenticated/student-photos/",
  "/storage/v1/object/sign/student-photos/",
  "/student-photos/",
];
const URL_LIFETIME_SECONDS = 600;

function privateObjectPath(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  let path = avatarUrl;
  const config = resolveSaaisEnvConfig();
  if (avatarUrl.startsWith("http") && config.supabaseUrl) {
    try {
      const parsed = new URL(avatarUrl);
      if (parsed.origin === new URL(config.supabaseUrl).origin)
        path = parsed.pathname;
    } catch {
      return null;
    }
  }
  const prefix = PREFIXES.find((candidate) => path.startsWith(candidate));
  return prefix ? path.slice(prefix.length) : null;
}

export function useStudentPhotoUrl(
  avatarUrl?: string | null,
  viewerId?: string,
) {
  const [resolved, setResolved] = useState<{ key: string; url: string } | null>(
    null,
  );
  const key = JSON.stringify([viewerId, avatarUrl]);
  const objectPath = privateObjectPath(avatarUrl);

  useEffect(() => {
    if (
      !objectPath ||
      !/^students\/[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(objectPath)
    )
      return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = async () => {
      try {
        const { data, error } = await getSupabaseClient()
          .storage.from("student-photos")
          .createSignedUrl(objectPath, URL_LIFETIME_SECONDS);
        if (!active) return;
        if (error || !data?.signedUrl) {
          setResolved(null);
        } else {
          setResolved({ key, url: data.signedUrl });
        }
      } catch {
        if (active) setResolved(null);
      }
      if (active) timer = setTimeout(refresh, 8 * 60 * 1000);
    };
    void refresh();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [objectPath, key]);

  return objectPath === null
    ? (avatarUrl ?? null)
    : resolved?.key === key
      ? resolved.url
      : null;
}
