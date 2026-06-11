import { Search, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonStyles } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionTable } from "@/features/analysis/components/SessionTable";
import {
  movementTypeLabels,
  type MovementType,
} from "@/features/analysis/types/analysis.types";
import { useDebounce } from "@/hooks/useDebounce";
import { useAnalysisSessions, useDeleteAnalysisSession } from "@/features/analysis/hooks/useAnalysis";
import { useMemo, useState } from "react";

const filterOptions = [
  { value: "all", label: "All types" },
  ...Object.entries(movementTypeLabels).map(([value, label]) => ({ value, label })),
];

export function AnalysisHistoryPage() {
  const { data: sessions = [], isLoading, isError } = useAnalysisSessions();
  const deleteSession = useDeleteAnalysisSession();
  const [search, setSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState<MovementType | "all">("all");
  const debouncedSearch = useDebounce(search);

  const filteredSessions = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesSearch = session.name.toLowerCase().includes(query);
      const matchesType = movementFilter === "all" || session.movementType === movementFilter;
      return matchesSearch && matchesType;
    });
  }, [debouncedSearch, movementFilter, sessions]);

  const handleDelete = (id: string) => {
    const shouldDelete = window.confirm("Delete this mock analysis session?");
    if (shouldDelete) {
      deleteSession.mutate(id);
    }
  };

  return (
    <div>
      <PageHeader
        title="Analysis History"
        description="Search, filter, open, or delete previous movement analysis sessions."
        actions={
          <Link to="/analysis/new" className={buttonStyles()}>
            <UploadCloud className="h-4 w-4" />
            New Analysis
          </Link>
        }
      />

      {isLoading ? <LoadingSpinner label="Loading analysis history" /> : null}

      {isError ? (
        <EmptyState
          title="History failed to load"
          description="The mock API returned an error. Refresh the page and try again."
        />
      ) : null}

      {!isLoading && !isError ? (
        sessions.length === 0 ? (
          <EmptyState
            title="No analysis history"
            description="Upload a movement video to create the first mock analysis session."
            icon={<UploadCloud className="h-10 w-10" />}
            action={
              <Link to="/analysis/new" className={buttonStyles()}>
                Start Analysis
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="grid gap-4 md:grid-cols-[1fr_220px]">
                <Input
                  label="Search"
                  placeholder="Search by session name"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Select
                  label="Movement Type"
                  value={movementFilter}
                  options={filterOptions}
                  onChange={(event) => setMovementFilter(event.target.value as MovementType | "all")}
                />
              </CardContent>
            </Card>

            {filteredSessions.length === 0 ? (
              <EmptyState
                title="No sessions match your filters"
                description="Try a different search keyword or movement type."
                icon={<Search className="h-10 w-10" />}
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <SessionTable
                    sessions={filteredSessions}
                    onDelete={handleDelete}
                    deletingId={deleteSession.variables}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )
      ) : null}
    </div>
  );
}
