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
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "RUNNING":
        return <Clock className="h-5 w-5 text-primary animate-pulse" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground/50" />;
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      ACTIVE: "bg-green-500/10 text-green-700 border-green-200/50",
      DRAFT: "bg-slate-100 text-slate-600 border-slate-200/50",
      PAUSED: "bg-amber-500/10 text-amber-700 border-amber-200/50",
      ARCHIVED: "bg-red-500/10 text-red-700 border-red-200/50",
    };
    return (
      <Badge variant="outline" className={cn("font-semibold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full shadow-none", variants[status] || variants.DRAFT)}>{status}</Badge>
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

  const passRate = recentRuns.length > 0
    ? Math.round((recentRuns.filter((r) => r.status === "PASSED").length / recentRuns.length) * 100)
    : null;

  return (
    <DashboardShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/projects" className="hover:text-foreground transition-colors font-medium">
            Projects
          </Link>
          <ChevronRight className="h-4 w-4 text-border" />
          <span className="text-foreground font-semibold">{project.name}</span>
        </div>

        {/* Header Section with subtle background */}
        <div className="relative mb-10 p-8 rounded-[2.5rem] bg-gradient-to-br from-card/60 via-card/40 to-muted/30 border border-border/40 shadow-glass backdrop-blur-xl">
          <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
          <div className="relative flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-display font-medium tracking-tight text-foreground mb-3">
                {project.name}
              </h1>
              <div className="flex items-center gap-4 text-base text-muted-foreground flex-wrap">
                <a
                  href={project.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium px-3 py-1.5 rounded-full bg-muted/50 border border-border/30"
                >
                  {project.baseUrl}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="font-medium px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
                  {project._count.tests} tests
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="font-medium px-3 py-1.5 rounded-full bg-muted/50 border border-border/30">
                  {project._count.runs} runs
                </span>
              </div>
              {project.description && (
                <p className="mt-4 text-muted-foreground text-lg max-w-2xl leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/projects/${projectId}/settings`}>
                <Button variant="outline" size="icon" className="rounded-full h-11 w-11 border-border/50 shadow-sm bg-card/60 hover:bg-card">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid - Each with distinct subtle tint */}
        <div className="grid gap-4 md:grid-cols-4 mb-10">
          {[
            { 
              label: "Total Tests", 
              value: project._count.tests,
              icon: FlaskConical,
              gradient: "from-blue-500/5 via-blue-400/3 to-transparent",
              borderColor: "border-blue-200/30",
            },
            { 
              label: "Active Tests", 
              value: tests.filter((t) => t.status === "ACTIVE").length,
              icon: Activity,
              gradient: "from-green-500/5 via-green-400/3 to-transparent",
              borderColor: "border-green-200/30",
            },
            { 
              label: "Total Runs", 
              value: project._count.runs,
              icon: BarChart3,
              gradient: "from-purple-500/5 via-purple-400/3 to-transparent",
              borderColor: "border-purple-200/30",
            },
            { 
              label: "Recent Pass Rate", 
              value: passRate !== null ? `${passRate}%` : "N/A",
              icon: TrendingUp,
              gradient: passRate && passRate >= 80 ? "from-emerald-500/5 via-emerald-400/3 to-transparent" : "from-amber-500/5 via-amber-400/3 to-transparent",
              borderColor: passRate && passRate >= 80 ? "border-emerald-200/30" : "border-amber-200/30",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className={cn(
                "relative overflow-hidden rounded-[2rem] border backdrop-blur-xl transition-all duration-500 h-full",
                "hover:shadow-xl hover:-translate-y-1",
                stat.borderColor
              )}>
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", stat.gradient)} />
                <div className="absolute top-4 right-4">
                  <stat.icon className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <CardHeader className="relative pb-3">
                  <CardDescription className="text-xs font-bold tracking-widest uppercase text-muted-foreground/80">
                    {stat.label}
                  </CardDescription>
                  <CardTitle className="text-4xl font-display font-medium tracking-tight mt-2">
                    {stat.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Section Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-border via-border/50 to-transparent" />
          <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground/60">Project Activity</span>
          <div className="h-px flex-1 bg-gradient-to-l from-border via-border/50 to-transparent" />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tests Section */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center border border-primary/10">
                  <FlaskConical className="h-5 w-5 text-primary/70" />
                </div>
                <h2 className="text-xl font-display font-medium tracking-tight">Tests</h2>
                <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted/70">
                  {tests.length}
                </Badge>
              </div>
              <Link href={`/projects/${projectId}/tests`}>
                <Button variant="outline" size="sm" className="rounded-full px-4 font-medium border-border/50 bg-card/60 hover:bg-card">
                  View All
                </Button>
              </Link>
            </div>

            {tests.length === 0 ? (
              <Card className="rounded-[2.5rem] border-border/40 shadow-glass backdrop-blur-xl bg-gradient-to-br from-card/50 to-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-5 border border-primary/10">
                    <FlaskConical className="h-8 w-8 text-primary/60" />
                  </div>
                  <p className="font-semibold text-lg mb-2">No tests yet</p>
                  <p className="text-muted-foreground mb-6 text-base text-center max-w-sm">
                    Create your first test to start testing your application
                  </p>
                  <Link href={`/projects/${projectId}/tests`}>
                    <Button className="rounded-full px-6 h-11 font-semibold shadow-lg shadow-primary/15">
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
                    transition={{ duration: 0.4, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link href={`/projects/${projectId}/tests/${test.id}`}>
                      <Card className="group relative overflow-hidden rounded-[1.75rem] border-border/40 backdrop-blur-xl transition-all duration-500 cursor-pointer bg-gradient-to-r from-card/70 via-card/50 to-muted/20 hover:from-card/80 hover:via-card/60 hover:to-muted/30 hover:shadow-lg hover:-translate-y-0.5">
                        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/15 group-hover:to-primary/8 transition-all border border-primary/10">
                                <FlaskConical className="h-5 w-5 text-primary/70" />
                              </div>
                              <div>
                                <p className="font-semibold text-lg">{test.name}</p>
                                <p className="text-sm text-muted-foreground/80 mt-0.5">
                                  {test.runs.length > 0
                                    ? `Last run ${formatDistanceToNow(test.runs[0].createdAt)}`
                                    : "No runs yet"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(test.status)}
                              <div className="w-8 h-8 rounded-full bg-muted/70 flex items-center justify-center group-hover:bg-primary/10 transition-colors border border-border/30">
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
          </div>

          {/* Recent Runs Section */}
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/8 flex items-center justify-center border border-orange-500/10">
                  <Play className="h-5 w-5 text-orange-500/70" />
                </div>
                <h2 className="text-xl font-display font-medium tracking-tight">Recent Runs</h2>
              </div>
              <Link href={`/projects/${projectId}/runs`}>
                <Button variant="outline" size="sm" className="rounded-full px-4 font-medium border-border/50 bg-card/60 hover:bg-card">
                  View All
                </Button>
              </Link>
            </div>

            {recentRuns.length === 0 ? (
              <Card className="rounded-[2.5rem] border-border/40 shadow-glass backdrop-blur-xl bg-gradient-to-br from-card/50 to-muted/20">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-orange-500/8 flex items-center justify-center mb-5 border border-orange-500/10">
                    <Play className="h-8 w-8 text-orange-500/60" />
                  </div>
                  <p className="font-semibold text-lg mb-2">No runs yet</p>
                  <p className="text-muted-foreground text-base text-center px-6">
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
                    transition={{ duration: 0.4, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link href={`/projects/${projectId}/tests/${run.id}/runs/${run.id}`}>
                      <Card className="group relative overflow-hidden rounded-[1.75rem] border-border/40 backdrop-blur-xl transition-all duration-500 cursor-pointer bg-gradient-to-r from-card/70 via-card/50 to-muted/20 hover:from-card/80 hover:via-card/60 hover:to-muted/30 hover:shadow-lg hover:-translate-y-0.5">
                        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-500/40 via-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-muted/70 flex items-center justify-center group-hover:bg-orange-500/10 transition-colors border border-border/30">
                              {getStatusIcon(run.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{run.test.name}</p>
                              <p className="text-sm text-muted-foreground/80 mt-0.5">
                                {formatDistanceToNow(run.createdAt)}
                                {run.duration && ` • ${Math.round(run.duration / 1000)}s`}
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
