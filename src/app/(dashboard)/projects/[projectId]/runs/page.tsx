"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";

interface Run {
  id: string;
  status: string;
  environment: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  test: { id: string; name: string };
  _count: { results: number };
}

export default function ProjectRunsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [runs, setRuns] = useState<Run[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectName, setProjectName] = useState<string>("");

  useEffect(() => {
    loadRuns();
  }, [projectId]);

  useEffect(() => {
    filterRuns();
  }, [runs, statusFilter]);

  async function loadRuns() {
    setLoading(true);
    try {
      const [runsRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/runs?limit=100`),
        fetch(`/api/projects/${projectId}`),
      ]);

      if (runsRes.ok) {
        const data = await runsRes.json();
        setRuns(data.runs);
      }
      if (projectRes.ok) {
        const project = await projectRes.json();
        setProjectName(project.name);
      }
    } catch (error) {
      console.error("Failed to load runs:", error);
    }
    setLoading(false);
  }

  function filterRuns() {
    if (statusFilter === "all") {
      setFilteredRuns(runs);
    } else {
      setFilteredRuns(runs.filter((run) => run.status === statusFilter));
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "PASSED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "RUNNING":
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "PASSED":
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "RUNNING":
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      case "PENDING":
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading runs...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-foreground"
        >
          {projectName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Runs</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Test Runs</h1>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PASSED">Passed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{runs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Passed</p>
            <p className="text-2xl font-bold text-green-600">
              {runs.filter((r) => r.status === "PASSED").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-600">
              {runs.filter((r) => r.status === "FAILED").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Running</p>
            <p className="text-2xl font-bold text-blue-600">
              {runs.filter((r) => r.status === "RUNNING").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Runs List */}
      {filteredRuns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {statusFilter === "all"
                ? "No runs yet. Run a test to see results here."
                : `No ${statusFilter.toLowerCase()} runs found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRuns.map((run) => (
            <Link
              key={run.id}
              href={`/projects/${projectId}/tests/${run.test.id}/runs/${run.id}`}
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(run.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{run.test.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatDistanceToNow(run.createdAt)}</span>
                        <span>•</span>
                        <span>{run.environment}</span>
                        <span>•</span>
                        <span>{run._count.results} steps</span>
                        {run.duration && (
                          <>
                            <span>•</span>
                            <span>{Math.round(run.duration / 1000)}s</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(run.status)}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
