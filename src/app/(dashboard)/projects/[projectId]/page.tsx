"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Play,
  Settings,
  ChevronRight,
  Plus,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  baseUrl: string;
  description: string | null;
  createdAt: string;
  members: {
    id: string;
    role: string;
    user: { id: string; name: string | null; email: string };
  }[];
  _count: { tests: number; runs: number };
}

interface Test {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  runs: { status: string; createdAt: string }[];
}

interface Run {
  id: string;
  status: string;
  environment: string;
  createdAt: string;
  duration: number | null;
  test: { name: string };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    setLoading(true);
    try {
      const [projectRes, testsRes, runsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/tests?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}/runs?limit=5`),
      ]);

      if (projectRes.ok) setProject(await projectRes.json());
      if (testsRes.ok) setTests(await testsRes.json());
      if (runsRes.ok) {
        const data = await runsRes.json();
        setRecentRuns(data.runs);
      }
    } catch (error) {
      console.error("Failed to load project:", error);
    }
    setLoading(false);
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "PASSED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "RUNNING":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      DRAFT: "bg-gray-100 text-gray-800",
      PAUSED: "bg-yellow-100 text-yellow-800",
      ARCHIVED: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={variants[status] || variants.DRAFT}>{status}</Badge>
    );
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!project) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Project not found</p>
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
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <a
              href={project.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              {project.baseUrl}
              <ExternalLink className="h-3 w-3" />
            </a>
            <span>•</span>
            <span>{project._count.tests} tests</span>
            <span>•</span>
            <span>{project._count.runs} runs</span>
          </div>
          {project.description && (
            <p className="mt-2 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}/settings`}>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tests</CardDescription>
            <CardTitle className="text-3xl">{project._count.tests}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Tests</CardDescription>
            <CardTitle className="text-3xl">
              {tests.filter((t) => t.status === "ACTIVE").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Runs</CardDescription>
            <CardTitle className="text-3xl">{project._count.runs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent Pass Rate</CardDescription>
            <CardTitle className="text-3xl">
              {recentRuns.length > 0
                ? `${Math.round(
                    (recentRuns.filter((r) => r.status === "PASSED").length /
                      recentRuns.length) *
                      100
                  )}%`
                : "N/A"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tests Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tests</h2>
            <Link href={`/projects/${projectId}/tests`}>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>

          {tests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FlaskConical className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="font-medium">No tests yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first test to start testing
                </p>
                <Link href={`/projects/${projectId}/tests`}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Test
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tests.slice(0, 5).map((test) => (
                <Link
                  key={test.id}
                  href={`/projects/${projectId}/tests/${test.id}`}
                >
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FlaskConical className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{test.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {test.runs.length > 0
                                ? `Last run ${formatDistanceToNow(test.runs[0].createdAt)}`
                                : "No runs yet"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(test.status)}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Runs Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Runs</h2>
            <Link href={`/projects/${projectId}/runs`}>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>

          {recentRuns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Play className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="font-medium">No runs yet</p>
                <p className="text-sm text-muted-foreground">
                  Run a test to see results here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <Link
                  key={run.id}
                  href={`/projects/${projectId}/tests/${run.id}/runs/${run.id}`}
                >
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(run.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{run.test.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(run.createdAt)}
                            {run.duration && ` • ${Math.round(run.duration / 1000)}s`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
