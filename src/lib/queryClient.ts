import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/services/types";
import { emitUnauthorized } from "@/lib/authEvents";

function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof ApiError && error.code === "UNAUTHORIZED") return true;
  if (error instanceof Response && error.status === 401) return true;
  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {},
  },
});

// Global 401 safety net: any query that throws an UNAUTHORIZED ApiError will
// trigger the auth event, clearing state and redirecting. This catches edge
// cases where a background refetch hits a 401 before the user interacts.
queryClient.getQueryCache().subscribe((event) => {
  if (
    event.type === "updated" &&
    event.action.type === "error" &&
    isUnauthorizedError(event.action.error)
  ) {
    emitUnauthorized();
  }
});
