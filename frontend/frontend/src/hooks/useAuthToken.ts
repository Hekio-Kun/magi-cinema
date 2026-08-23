import { useSyncExternalStore } from "react";
import { getAuthToken, subscribeAuthChanges } from "@/utils/authSession";

const getServerAuthToken = () => null;

export function useAuthToken(): string | null {
  return useSyncExternalStore(
    subscribeAuthChanges,
    getAuthToken,
    getServerAuthToken
  );
}
