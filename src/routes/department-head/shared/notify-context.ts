import { notify } from "@/lib/notify";

/** Shows a short confirmation toast. Kept as a hook so existing call sites are unchanged. */
export function useNotify() {
  return notify;
}
