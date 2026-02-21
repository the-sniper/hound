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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Play,
  MoreVertical,
  Edit,
  Trash2,
  FlaskConical,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Check,
  Square,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { toast } from "sonner";

interface Environment {
  id: string;
  name: string;
  isDefault: boolean;
}

interface TestHealth {
  passRate: number | null;
  flakiness: number | null;
  trend: "improving" | "stable" | "declining" | "unknown";
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
}

interface Test {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  _count: { steps: number; runs: number };
  runs: { status: string; createdAt: string }[];
  health: TestHealth;
}

interface Project {
  id: string;
  name: string;
  baseUrl: string;
}

export default function TestsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [tests, setTests] = useState<Test[]>([]);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
  });
  const [deleteConfirmTest, setDeleteConfirmTest] = useState<Test | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>("");

  // Bulk operations state
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  useEffect(() => {
    loadData();
    loadEnvironments();
  }, [projectId]);

  async function loadEnvironments() {
    try {
      const res = await fetch(`/api/projects/${projectId}/environments`);
      if (res.ok) {
        const data = await res.json();
        setEnvironments(data);
        // Select default environment
        const defaultEnv = data.find((e: Environment) => e.isDefault);
        if (defaultEnv) {
          setSelectedEnvironmentId(defaultEnv.id);
        }
      }
    } catch (error) {
      console.error("Failed to load environments:", error);
    }
  }

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredTests(
      tests.filter(
        (test) =>
          test.name.toLowerCase().includes(query) ||
          (test.description?.toLowerCase().includes(query) ?? false)
      )
    );
  }, [tests, searchQuery]);

  async function loadData() {
    setLoading(true);
    try {
      const [testsRes, projectRes] = await Promise.all([
        fetch(`/api/tests?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}`),
      ]);

      if (testsRes.ok) {
        setTests(await testsRes.json());
      }
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTest.name,
          description: newTest.description || undefined,
          projectId,
          steps: [],
        }),
      });

      if (res.ok) {
        const test = await res.json();
        toast.success("Test created");
        setCreateDialogOpen(false);
        setNewTest({ name: "", description: "" });
        // Navigate to the test editor
        window.location.href = `/projects/${projectId}/tests/${test.id}`;
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create test");
      }
    } catch (error) {
      toast.error("Failed to create test");
    }
    setCreating(false);
  }

  async function handleRunTest(testId: string, envId?: string) {
    try {
      const body: { testId: string; projectId: string; environmentId?: string } = {
        testId,
        projectId,
      };
      if (envId) {
        body.environmentId = envId;
      }

      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const run = await res.json();
        toast.success("Test run started");
        // Navigate to the run viewer
        window.location.href = `/projects/${projectId}/tests/${testId}/runs/${run.id}`;
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to start test run");
      }
    } catch (error) {
      toast.error("Failed to start test run");
    }
  }

  async function handleDeleteTest() {
    if (!deleteConfirmTest) return;

    try {
      const res = await fetch(`/api/tests/${deleteConfirmTest.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Test deleted");
        setTests((prev) => prev.filter((t) => t.id !== deleteConfirmTest.id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete test");
      }
    } catch (error) {
      toast.error("Failed to delete test");
    }
    setDeleteConfirmTest(null);
  }

  // Bulk operations
  function toggleTestSelection(testId: string) {
    setSelectedTests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  }

  function selectAllTests() {
    if (selectedTests.size === filteredTests.length) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(filteredTests.map((t) => t.id)));
    }
  }

  async function handleBulkRun() {
    if (selectedTests.size === 0) return;

    setBulkRunning(true);
    try {
      const res = await fetch("/api/tests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "run",
          testIds: Array.from(selectedTests),
          projectId,
          environmentId: selectedEnvironmentId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Started ${data.total} test runs`);
        setSelectedTests(new Set());
        setShowBulkActions(false);
        // Reload to show updates
        setTimeout(loadData, 2000);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to run tests");
      }
    } catch (error) {
      toast.error("Failed to run tests");
    }
    setBulkRunning(false);
  }

  async function handleBulkDelete() {
    if (selectedTests.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedTests.size} tests? This cannot be undone.`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      const res = await fetch("/api/tests/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "delete",
          testIds: Array.from(selectedTests),
          projectId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Deleted ${data.successful} tests`);
        if (data.failed > 0) {
          toast.error(`Failed to delete ${data.failed} tests`);
        }
        setSelectedTests(new Set());
        setShowBulkActions(false);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete tests");
      }
    } catch (error) {
      toast.error("Failed to delete tests");
    }
    setBulkDeleting(false);
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

  function getHealthColor(passRate: number | null): string {
    if (passRate === null) return "text-gray-400";
    if (passRate >= 90) return "text-green-600";
    if (passRate >= 70) return "text-yellow-600";
    return "text-red-600";
  }

  function getHealthBgColor(passRate: number | null): string {
    if (passRate === null) return "bg-gray-100";
    if (passRate >= 90) return "bg-green-100";
    if (passRate >= 70) return "bg-yellow-100";
    return "bg-red-100";
  }

  function getFlakinessColor(flakiness: number | null): string {
    if (flakiness === null) return "text-gray-400";
    if (flakiness === 0) return "text-green-600";
    if (flakiness <= 30) return "text-yellow-600";
    return "text-red-600";
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      case "stable":
        return <Minus className="h-3 w-3 text-blue-600" />;
      default:
        return <Activity className="h-3 w-3 text-gray-400" />;
    }
  }

  function HealthIndicator({ health }: { health: TestHealth }) {
    if (health.totalRuns === 0) {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>No runs yet</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        {/* Pass Rate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${getHealthBgColor(health.passRate)} ${getHealthColor(health.passRate)}`}>
              {health.passRate !== null ? `${health.passRate}%` : "N/A"}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pass rate: {health.passedRuns}/{health.totalRuns} runs</p>
          </TooltipContent>
        </Tooltip>

        {/* Flakiness */}
        {health.flakiness !== null && health.flakiness > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 ${getFlakinessColor(health.flakiness)}`}>
                <AlertCircle className="h-3 w-3" />
                {health.flakiness}% flaky
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Flakiness: {health.flakiness}% status changes between runs</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Trend */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {getTrendIcon(health.trend)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Trend: {health.trend}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading tests...</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <TooltipProvider>
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
          {project?.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Tests</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Tests</h1>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Test</DialogTitle>
              <DialogDescription>
                Create a new test for {project?.name}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Test Name</Label>
                <Input
                  id="name"
                  value={newTest.name}
                  onChange={(e) =>
                    setNewTest((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Login Flow Test"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newTest.description}
                  onChange={(e) =>
                    setNewTest((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What does this test verify?"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Test"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Bulk Actions */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Bulk Actions Toggle */}
        <Button
          variant={showBulkActions ? "secondary" : "outline"}
          onClick={() => setShowBulkActions(!showBulkActions)}
        >
          <Check className="h-4 w-4 mr-2" />
          {showBulkActions ? "Done" : "Select"}
        </Button>
      </div>

      {/* Bulk Actions Toolbar */}
      {showBulkActions && selectedTests.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedTests.size} test{selectedTests.size !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {environments.length > 0 && (
              <select
                value={selectedEnvironmentId}
                onChange={(e) => setSelectedEnvironmentId(e.target.value)}
                className="text-sm border rounded px-2 py-1 bg-white"
              >
                <option value="">No environment</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkRun}
              disabled={bulkRunning}
            >
              {bulkRunning ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Run All
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Tests Grid */}
      {showBulkActions && filteredTests.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={selectAllTests}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <div className={`flex h-4 w-4 items-center justify-center rounded border ${
              selectedTests.size === filteredTests.length && filteredTests.length > 0
                ? "bg-primary border-primary text-white"
                : "border-gray-300"
            }`}>
              {selectedTests.size === filteredTests.length && filteredTests.length > 0 && (
                <Check className="h-3 w-3" />
              )}
            </div>
            {selectedTests.size === filteredTests.length && filteredTests.length > 0
              ? "Deselect All"
              : `Select All (${filteredTests.length})`}
          </button>
        </div>
      )}

      {filteredTests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {searchQuery ? "No tests match your search" : "No tests yet"}
            </p>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Create your first test to start testing"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Test
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTests.map((test) => (
            <Card key={test.id} className={`group ${selectedTests.has(test.id) ? "border-primary" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {showBulkActions && (
                      <button
                        onClick={() => toggleTestSelection(test.id)}
                        className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                          selectedTests.has(test.id)
                            ? "bg-primary border-primary text-white"
                            : "border-gray-300 hover:border-primary"
                        }`}
                      >
                        {selectedTests.has(test.id) && <Check className="h-3 w-3" />}
                      </button>
                    )}
                    <Link
                      href={`/projects/${projectId}/tests/${test.id}`}
                      className="flex-1 min-w-0"
                    >
                      <p className="font-medium truncate group-hover:text-primary transition-colors">
                        {test.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {test._count.steps} steps
                      </p>
                    </Link>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${projectId}/tests/${test.id}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {environments.length > 0 ? (
                        <DropdownMenuItem asChild>
                          <div className="relative">
                            <select
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              value={selectedEnvironmentId}
                              onChange={(e) => {
                                handleRunTest(test.id, e.target.value || undefined);
                              }}
                            >
                              <option value="">Default (no env)</option>
                              {environments.map((env) => (
                                <option key={env.id} value={env.id}>
                                  Run with: {env.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center">
                              <Play className="mr-2 h-4 w-4" />
                              <span>Run Test...</span>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleRunTest(test.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          Run Now
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setDeleteConfirmTest(test)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {test.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {test.description}
                  </p>
                )}

                {/* Health Indicator */}
                <div className="pt-2">
                  <HealthIndicator health={test.health} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(test.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {test.runs.length > 0 && (
                      <>
                        {getStatusIcon(test.runs[0].status)}
                        <span>
                          {formatDistanceToNow(test.runs[0].createdAt)}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>{test._count.runs} runs</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmTest}
        onOpenChange={() => setDeleteConfirmTest(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirmTest?.name}&quot;? This
              action cannot be undone. All runs and data will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmTest(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTest}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
    </TooltipProvider>
  );
}
