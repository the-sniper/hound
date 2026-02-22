"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
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
  Activity,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { formatDistanceToNow, cn } from "@/lib/utils";

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
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "RUNNING":
        return <Clock className="h-5 w-5 text-primary animate-pulse" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground/50" />;
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      ACTIVE: "bg-green-500/10 text-green-600 border-green-500/20",
      DRAFT: "bg-muted text-muted-foreground border-border/50",
      PAUSED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      ARCHIVED: "bg-red-500/10 text-red-600 border-red-500/20",
    };
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-bold text-[10px] tracking-[0.15em] uppercase px-3 py-1 rounded-lg shadow-sm backdrop-blur-sm",
          variants[status] || variants.DRAFT,
        )}
      >
        {status}
      </Badge>
    );
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="font-medium">Loading project...</span>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!project) {
    return (
      <DashboardShell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center py-20"
        >
          <p className="text-muted-foreground">Project not found</p>
        </motion.div>
      </DashboardShell>
    );
  }

  const passRate =
    recentRuns.length > 0
      ? Math.round(
          (recentRuns.filter((r) => r.status === "PASSED").length /
            recentRuns.length) *
            100,
        )
      : null;

  return (
    <DashboardShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-8"
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/projects"
            className="hover:text-slate-700 transition-colors font-medium"
          >
            Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-900 font-semibold">{project.name}</span>
        </div>

        {/* Header Section - Glassmorphism */}
        <div className="relative p-10 rounded-[2.5rem] border border-border/40 bg-card/40 backdrop-blur-xl shadow-elegant overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-6">
              <h1 className="text-5xl font-display font-bold tracking-tight text-foreground">
                {project.name}
              </h1>
              <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
                <a
                  href={project.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary transition-all duration-300 font-bold text-sm px-4 py-2 rounded-xl bg-background/50 border border-border/40 hover:border-primary/30 shadow-sm group"
                >
                  {project.baseUrl}
                  <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
                <div className="h-1.5 w-1.5 rounded-full bg-border" />
                <span className="font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl bg-green-500/5 text-green-600 border border-green-500/10">
                  {project._count.tests} tests
                </span>
                <div className="h-1.5 w-1.5 rounded-full bg-border" />
                <span className="font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl bg-primary/5 text-primary border border-primary/10">
                  {project._count.runs} runs
                </span>
              </div>
              {project.description && (
                <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed font-medium opacity-80">
                  {project.description}
                </p>
              )}
            </div>
            <Link href={`/projects/${projectId}/settings`}>
              <Button
                variant="outline"
                size="icon"
                className="rounded-2xl h-12 w-12 border-border/40 bg-background/50 hover:bg-background hover:border-primary/30 transition-all duration-300 shadow-sm"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid - Soft Pastel Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            {
              label: "Total Tests",
              value: project._count.tests,
              icon: FlaskConical,
              bg: "bg-card/40",
              border: "border-border/40",
              iconBg: "bg-primary/10 text-primary",
              accent: "bg-primary",
            },
            {
              label: "Active Tests",
              value: tests.filter((t) => t.status === "ACTIVE").length,
              icon: Activity,
              bg: "bg-card/40",
              border: "border-border/40",
              iconBg: "bg-green-500/10 text-green-600",
              accent: "bg-green-500",
            },
            {
              label: "Total Runs",
              value: project._count.runs,
              icon: BarChart3,
              bg: "bg-card/40",
              border: "border-border/40",
              iconBg: "bg-blue-500/10 text-blue-600",
              accent: "bg-blue-500",
            },
            {
              label: "Pass Rate",
              value: passRate !== null ? `${passRate}%` : "N/A",
              icon: TrendingUp,
              bg: "bg-card/40",
              border: "border-border/40",
              iconBg:
                passRate && passRate >= 80
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600",
              accent:
                passRate && passRate >= 80 ? "bg-green-500" : "bg-red-500",
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
              <Card
                className={cn(
                  "group relative overflow-hidden rounded-[2rem] border backdrop-blur-xl transition-all duration-500 h-full",
                  stat.bg,
                  stat.border,
                )}
              >
                <div
                  className={cn(
                    "absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    stat.accent,
                  )}
                />
                <CardHeader className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <CardDescription className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
                      {stat.label}
                    </CardDescription>
                    <div
                      className={cn(
                        "p-2.5 rounded-xl transition-transform duration-500 group-hover:scale-110",
                        stat.iconBg,
                      )}
                    >
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <CardTitle className="text-4xl font-display font-bold tracking-tight text-foreground">
                    {stat.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Section Divider with Background */}
        <div className="relative py-8 w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background/80 backdrop-blur-md px-6 py-1 rounded-full border border-border/40 text-[10px] font-bold tracking-[0.3em] pl-[0.3em] uppercase text-muted-foreground/60">
              Project Activity
            </span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tests Section - Mint Tint */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                  <FlaskConical className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold tracking-tight text-foreground">
                    Tests
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground/60">
                    Your test suites
                  </p>
                </div>
                <Badge className="rounded-lg px-3 py-1 text-xs font-bold bg-primary/5 text-primary border-primary/20">
                  {tests.length}
                </Badge>
              </div>
              <Link href={`/projects/${projectId}/tests`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl px-4 font-bold text-xs uppercase tracking-wider hover:bg-primary/5 hover:text-primary transition-all"
                >
                  View All
                </Button>
              </Link>
            </div>

            {tests.length === 0 ? (
              <Card className="rounded-2xl border-emerald-100/50 bg-gradient-to-br from-emerald-50/30 to-teal-50/20">
                <CardContent className="flex flex-col items-center justify-center py-14">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-5 border border-emerald-200 shadow-sm">
                    <FlaskConical className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="font-semibold text-lg text-slate-700 mb-2">
                    No tests yet
                  </p>
                  <p className="text-slate-500 mb-6 text-base text-center max-w-sm">
                    Create your first test to start testing your application
                  </p>
                  <Link href={`/projects/${projectId}/tests`}>
                    <Button className="rounded-full px-6 h-11 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Test
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tests.slice(0, 5).map((test, i) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: i * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <Link href={`/projects/${projectId}/tests/${test.id}`}>
                      <Card className="group relative overflow-hidden rounded-[1.5rem] border-border/40 transition-all duration-500 cursor-pointer bg-card/40 backdrop-blur-xl hover:border-primary/30">
                        <div className="absolute inset-y-0 left-0 w-1.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div className="w-14 h-14 rounded-2xl bg-background/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-border/40 group-hover:border-primary/20">
                                <FlaskConical className="h-6 w-6 text-primary/60 group-hover:text-primary transition-colors" />
                              </div>
                              <div>
                                <p className="font-bold text-xl text-foreground group-hover:text-primary transition-colors duration-300">
                                  {test.name}
                                </p>
                                <p className="text-sm font-medium text-muted-foreground/60 mt-1">
                                  {test.runs.length > 0
                                    ? `Last run ${formatDistanceToNow(test.runs[0].createdAt)}`
                                    : "No runs yet"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              {getStatusBadge(test.status)}
                              <div className="w-10 h-10 rounded-2xl bg-background/50 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 border border-border/40 group-hover:border-primary">
                                <ChevronRight className="h-5 w-5 opacity-40 group-hover:opacity-100" />
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
          </div>

          {/* Recent Runs Section - Peach/Orange Tint */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-sm">
                  <Play className="h-5 w-5 text-blue-600 fill-blue-600/20" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold tracking-tight text-foreground">
                    Activity
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground/60">
                    Execution history
                  </p>
                </div>
              </div>
              <Link href={`/projects/${projectId}/runs`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl px-4 font-bold text-xs uppercase tracking-wider hover:bg-blue-500/5 hover:text-blue-600 transition-all"
                >
                  View All
                </Button>
              </Link>
            </div>

            {recentRuns.length === 0 ? (
              <Card className="rounded-2xl border-orange-100/50 bg-gradient-to-br from-orange-50/30 to-amber-50/20">
                <CardContent className="flex flex-col items-center justify-center py-14">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-5 border border-orange-200 shadow-sm">
                    <Play className="h-8 w-8 text-orange-600 fill-orange-100" />
                  </div>
                  <p className="font-semibold text-lg text-slate-700 mb-2">
                    No runs yet
                  </p>
                  <p className="text-slate-500 text-base text-center px-6">
                    Run a test to see execution results here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run, i) => (
                  <motion.div
                    key={run.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: i * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <Link
                      href={`/projects/${projectId}/tests/${run.id}/runs/${run.id}`}
                    >
                      <Card className="group relative overflow-hidden rounded-[1.5rem] border-border/40 transition-all duration-500 cursor-pointer bg-card/40 backdrop-blur-xl hover:border-blue-500/30">
                        <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-background/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-border/40 group-hover:border-blue-500/20">
                              {getStatusIcon(run.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate text-foreground group-hover:text-blue-600 transition-colors duration-300">
                                {run.test.name}
                              </p>
                              <p className="text-sm font-medium text-muted-foreground/60 mt-1">
                                {formatDistanceToNow(run.createdAt)}
                                {run.duration &&
                                  ` • ${Math.round(run.duration / 1000)}s`}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </DashboardShell>
  );
}
