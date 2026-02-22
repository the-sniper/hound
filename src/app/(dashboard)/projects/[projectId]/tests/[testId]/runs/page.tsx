"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
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
  Play,
} from "lucide-react";
import { formatDistanceToNow, cn } from "@/lib/utils";

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

interface TestData {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
}

export default function TestRunsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const testId = params.testId as string;

  const [runs, setRuns] = useState<Run[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [testData, setTestData] = useState<TestData | null>(null);

  useEffect(() => {
    loadRuns();
  }, [testId]);

  useEffect(() => {
    filterRuns();
  }, [runs, statusFilter]);

  async function loadRuns() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${testId}/runs?limit=100`);

      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs);
        setTestData(data.test);
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
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "RUNNING":
        return <Clock className="h-5 w-5 text-primary animate-pulse" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      PASSED: "bg-green-500/10 text-green-700 border-green-200/50",
      FAILED: "bg-red-500/10 text-red-700 border-red-200/50",
      RUNNING: "bg-blue-500/10 text-blue-700 border-blue-200/50",
      PENDING: "bg-muted text-muted-foreground border-border/50",
    };
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-semibold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full shadow-none",
          variants[status] || "",
        )}
      >
        {status.toLowerCase()}
      </Badge>
    );
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-medium">Loading runs...</span>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link
            href="/projects"
            className="hover:text-foreground transition-colors font-medium"
          >
            Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-foreground transition-colors font-medium"
          >
            {testData?.projectName || "Project"}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/projects/${projectId}/tests/${testId}`}
            className="hover:text-foreground transition-colors font-medium"
          >
            {testData?.name || "Test"}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-semibold">Runs</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}/tests/${testId}`}>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-11 w-11 border-border/50"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-4xl font-display font-normal tracking-tight">
              {testData?.name} Runs
            </h1>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] rounded-full h-11 border-border/50">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PASSED">Passed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="RUNNING">Running</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-4 mb-8">
          {[
            { label: "Total", value: runs.length, color: "" },
            {
              label: "Passed",
              value: runs.filter((r) => r.status === "PASSED").length,
              color: "text-green-600",
            },
            {
              label: "Failed",
              value: runs.filter((r) => r.status === "FAILED").length,
              color: "text-red-600",
            },
            {
              label: "Running",
              value: runs.filter((r) => r.status === "RUNNING").length,
              color: "text-primary",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Card className="rounded-[2rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40">
                <CardContent className="p-5">
                  <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-2">
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "text-4xl font-display font-normal tracking-tight",
                      stat.color,
                    )}
                  >
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Runs List */}
        {filteredRuns.length === 0 ? (
          <Card className="rounded-[2.5rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
                <Play className="h-10 w-10 text-primary/60" />
              </div>
              <p className="text-xl font-semibold mb-2">
                {statusFilter === "all"
                  ? "No runs yet"
                  : `No ${statusFilter.toLowerCase()} runs`}
              </p>
              <p className="text-muted-foreground text-base">
                {statusFilter === "all"
                  ? "Run this test to see results here"
                  : "Try a different filter"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRuns.map((run, i) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  href={`/projects/${projectId}/tests/${testId}/runs/${run.id}`}
                >
                  <Card className="group rounded-[2rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40 hover:bg-card/60 hover:border-primary/20 transition-all duration-500 cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                          {getStatusIcon(run.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg">
                            Run #{runs.length - i}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                            <span>{formatDistanceToNow(run.createdAt)}</span>
                            <span className="text-border">•</span>
                            <span>{run.environment}</span>
                            <span className="text-border">•</span>
                            <span>{run._count.results} steps</span>
                            {run.duration && (
                              <>
                                <span className="text-border">•</span>
                                <span>{Math.round(run.duration / 1000)}s</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(run.status)}
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </DashboardShell>
  );
}
