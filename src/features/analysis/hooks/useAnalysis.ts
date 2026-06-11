import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAnalysisSession,
  deleteAnalysisSession,
  getAnalysisSessionById,
  getAnalysisSessions,
  getAnalysisStatus,
} from "@/features/analysis/api/analysisApi";
import type { CreateAnalysisSessionPayload } from "@/features/analysis/types/analysis.types";

export const analysisQueryKeys = {
  all: ["analysis"] as const,
  sessions: ["analysis", "sessions"] as const,
  session: (id: string) => ["analysis", "session", id] as const,
  status: (id: string) => ["analysis", "status", id] as const,
};

export function useAnalysisSessions() {
  return useQuery({
    queryKey: analysisQueryKeys.sessions,
    queryFn: getAnalysisSessions,
  });
}

export function useAnalysisSession(id?: string) {
  return useQuery({
    queryKey: analysisQueryKeys.session(id ?? ""),
    queryFn: () => getAnalysisSessionById(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useAnalysisStatus(id?: string) {
  return useQuery({
    queryKey: analysisQueryKeys.status(id ?? ""),
    queryFn: () => getAnalysisStatus(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateAnalysisSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAnalysisSessionPayload) => createAnalysisSession(payload),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: analysisQueryKeys.sessions });
      queryClient.setQueryData(analysisQueryKeys.session(session.id), session);
    },
  });
}

export function useDeleteAnalysisSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAnalysisSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analysisQueryKeys.sessions });
    },
  });
}
