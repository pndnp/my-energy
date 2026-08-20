import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CreateDailyLogInput, DailyLog, PartialUpdate } from "@/types/daily-log";

export function useDailyLogQuery(date: string) {
  return useQuery<DailyLog | null, Error>({
    queryKey: ["dailyLog", date],
    queryFn: async () => {
      const res = await api.get(`/daily-logs/${date}`);
      return res.data;
    },
    retry: false,
  });
}

export function useListDailyLogs(from: string, to: string) {
  return useQuery<DailyLog[], Error>({
    queryKey: ["dailyLogs", from, to],
    queryFn: async () => {
      const res = await api.get("/daily-logs", {
        params: { from, to },
      });
      return res.data;
    },
    enabled: !!from && !!to,
  });
}

export interface UseDailyLogMutationOptions {
  isUpdate: boolean;
  data: CreateDailyLogInput | PartialUpdate;
  date: string;
  onSuccess?: () => void;
}

export function useDailyLogMutation(date: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UseDailyLogMutationOptions>({
    mutationFn: async ({ isUpdate, data }: UseDailyLogMutationOptions) => {
      if (isUpdate) {
        await api.put(`/daily-logs/${date}`, data);
      } else {
        await api.post("/daily-logs", data);
      }
    },
    onSuccess: (_data, _variables) => {
      // Invalidate both single log and list queries
      queryClient.invalidateQueries({ queryKey: ["dailyLog", date] });
      queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
      onSuccess?.();
    },
  });
}
