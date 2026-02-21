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
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { toast } from "sonner";

interface Test {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  _count: { steps: number; runs: number };
  runs: { status: string; createdAt: string }[];
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

  useEffect(() => {
    loadData();
  }, [projectId]);

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

  async function handleRunTest(testId: string) {
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
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
          <p className="text-muted-foreground">Loading tests...</p>
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

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tests Grid */}
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
            <Card key={test.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
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
                      <DropdownMenuItem onClick={() => handleRunTest(test.id)}>
                        <Play className="mr-2 h-4 w-4" />
                        Run Now
                      </DropdownMenuItem>
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
  );
}
