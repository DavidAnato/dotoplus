import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STALE_MS = 5 * 60 * 1000;
const GC_MS = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_MS,
      gcTime: GC_MS,
      retry: 1,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: "offlineFirst",
    },
    mutations: { retry: 0, networkMode: "offlineFirst" },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "dotoplus-react-query",
});

export const persistOptions = {
  persister: queryPersister,
  maxAge: GC_MS,
  // v4 : consent + grants actifs + revoke
  buster: "v4-consent-revoke",
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: unknown; state: { status: string } }) => {
      const key = JSON.stringify(query.queryKey);
      if (key.includes("access-requests") || key.includes("notifications")) return false;
      return query.state.status === "success";
    },
  },
};
