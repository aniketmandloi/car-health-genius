import type { AppRouter } from "@car-health-genius/api/routers/index";

import { env } from "@car-health-genius/env/native";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { Platform } from "react-native";

import { authClient } from "@/lib/auth-client";

const NATIVE_FETCH_TIMEOUT_MS = 15_000;

/**
 * Wraps the native fetch with an AbortController timeout.
 * Without this, requests to an unreachable server hang for 30-90 seconds
 * at the OS level before the query shows an error state.
 */
function nativeFetch(
  url: RequestInfo | URL,
  options?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    NATIVE_FETCH_TIMEOUT_MS,
  );

  return fetch(url, {
    ...options,
    // Preserve any caller-supplied signal while still applying the timeout
    signal: options?.signal ?? controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

export const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.EXPO_PUBLIC_SERVER_URL}/trpc`,
      fetch:
        Platform.OS !== "web"
          ? nativeFetch
          : function (url, options) {
              return fetch(url, {
                ...options,
                credentials: "include",
              });
            },
      headers() {
        if (Platform.OS === "web") {
          return {};
        }
        try {
          const cookies = authClient.getCookie();
          if (!cookies) return {};
          return { Cookie: cookies };
        } catch {
          // getCookie should never throw, but guard against broken auth state
          return {};
        }
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
