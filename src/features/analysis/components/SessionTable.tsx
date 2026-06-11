import { Eye, Printer, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonStyles } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import {
  analysisStatusLabels,
  movementTypeLabels,
  type AnalysisSession,
  type AnalysisStatus,
} from "@/features/analysis/types/analysis.types";
import { formatShortDate } from "@/lib/formatDate";

type SessionTableProps = {
  sessions: AnalysisSession[];
  onDelete?: (id: string) => void;
  deletingId?: string;
};

const statusTone: Record<AnalysisStatus, "slate" | "blue" | "green" | "red"> = {
  pending: "slate",
  processing: "blue",
  completed: "green",
  failed: "red",
};

export function SessionTable({ sessions, onDelete, deletingId }: SessionTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Session Name</TableHeaderCell>
          <TableHeaderCell>Movement Type</TableHeaderCell>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Score</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell className="text-right">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell>
              <p className="font-medium text-slate-950">{session.name}</p>
            </TableCell>
            <TableCell>{movementTypeLabels[session.movementType]}</TableCell>
            <TableCell>{formatShortDate(session.createdAt)}</TableCell>
            <TableCell>{session.score ?? "--"}</TableCell>
            <TableCell>
              <Badge tone={statusTone[session.status]}>{analysisStatusLabels[session.status]}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Link
                  to={`/analysis/${session.id}`}
                  className={buttonStyles({ size: "icon", variant: "outline", className: "h-9 w-9" })}
                  aria-label={`View ${session.name}`}
                >
                  <Eye className="h-4 w-4" />
                </Link>
                <Link
                  to={`/analysis/${session.id}/report`}
                  className={buttonStyles({ size: "icon", variant: "outline", className: "h-9 w-9" })}
                  aria-label={`Print report for ${session.name}`}
                >
                  <Printer className="h-4 w-4" />
                </Link>
                {onDelete ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-rose-700 hover:bg-rose-50"
                    aria-label={`Delete ${session.name}`}
                    disabled={deletingId === session.id}
                    onClick={() => onDelete(session.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
