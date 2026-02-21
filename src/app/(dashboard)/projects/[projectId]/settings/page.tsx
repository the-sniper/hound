"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Trash2,
  Users,
  Shield,
  Plus,
  Settings2,
  X,
  Check,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

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
}

interface Environment {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  variables: string; // JSON string
  createdAt: string;
}

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    baseUrl: "",
    description: "",
  });

  // Environment state
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isCreatingEnv, setIsCreatingEnv] = useState(false);
  const [editingEnv, setEditingEnv] = useState<string | null>(null);
  const [newEnv, setNewEnv] = useState({
    name: "",
    description: "",
    isDefault: false,
    variables: [] as { key: string; value: string }[],
  });

  useEffect(() => {
    loadProject();
    loadEnvironments();
  }, [projectId]);

  async function loadProject() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setFormData({
          name: data.name,
          baseUrl: data.baseUrl,
          description: data.description ?? "",
        });
      } else {
        toast.error("Failed to load project");
      }
    } catch (error) {
      console.error("Failed to load project:", error);
      toast.error("Failed to load project");
    }
    setLoading(false);
  }

  async function loadEnvironments() {
    try {
      const res = await fetch(`/api/projects/${projectId}/environments`);
      if (res.ok) {
        const data = await res.json();
        setEnvironments(data);
      }
    } catch (error) {
      console.error("Failed to load environments:", error);
    }
  }

  function parseVariables(variablesStr: string): { key: string; value: string }[] {
    try {
      const vars = JSON.parse(variablesStr);
      return Object.entries(vars).map(([key, value]) => ({
        key,
        value: value as string,
      }));
    } catch {
      return [];
    }
  }

  function stringifyVariables(vars: { key: string; value: string }[]): string {
    const obj: Record<string, string> = {};
    vars.forEach((v) => {
      if (v.key.trim()) {
        obj[v.key.trim()] = v.value;
      }
    });
    return JSON.stringify(obj);
  }

  async function createEnvironment() {
    if (!newEnv.name.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/environments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEnv.name,
          description: newEnv.description,
          isDefault: newEnv.isDefault,
          variables: JSON.parse(stringifyVariables(newEnv.variables)),
        }),
      });

      if (res.ok) {
        toast.success("Environment created");
        setNewEnv({
          name: "",
          description: "",
          isDefault: false,
          variables: [],
        });
        setIsCreatingEnv(false);
        loadEnvironments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create environment");
      }
    } catch (error) {
      toast.error("Failed to create environment");
    }
  }

  async function updateEnvironment(envId: string) {
    const env = environments.find((e) => e.id === envId);
    if (!env) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${envId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: env.name,
          description: env.description,
          isDefault: env.isDefault,
          variables: JSON.parse(env.variables),
        }),
      });

      if (res.ok) {
        toast.success("Environment updated");
        setEditingEnv(null);
        loadEnvironments();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update environment");
      }
    } catch (error) {
      toast.error("Failed to update environment");
    }
  }

  async function deleteEnvironment(envId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${envId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Environment deleted");
        loadEnvironments();
      } else {
        toast.error("Failed to delete environment");
      }
    } catch (error) {
      toast.error("Failed to delete environment");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          baseUrl: formData.baseUrl,
          description: formData.description || null,
        }),
      });

      if (res.ok) {
        toast.success("Project updated successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update project");
      }
    } catch (error) {
      toast.error("Failed to update project");
    }
    setSaving(false);
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Project deleted");
        router.push("/projects");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete project");
      }
    } catch (error) {
      toast.error("Failed to delete project");
    }
    setDeleteDialogOpen(false);
  }

  const currentUserRole = project?.members.find(
    (m) => m.user.id === "current-user-id"
  )?.role;

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading settings...</p>
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
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-foreground"
        >
          {project.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Settings</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Project Settings</h1>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Update your project name, URL, and description
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      baseUrl: e.target.value,
                    }))
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  The base URL of the website you are testing
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Environments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Environments
            </CardTitle>
            <CardDescription>
              Manage environments and their variables for variable substitution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Environment List */}
              {environments.map((env) => (
                <div key={env.id} className="border rounded-lg p-4">
                  {editingEnv === env.id ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={env.name}
                          onChange={(e) =>
                            setEnvironments((prev) =>
                              prev.map((p) =>
                                p.id === env.id ? { ...p, name: e.target.value } : p
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={env.description || ""}
                          onChange={(e) =>
                            setEnvironments((prev) =>
                              prev.map((p) =>
                                p.id === env.id ? { ...p, description: e.target.value } : p
                              )
                            )
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`default-${env.id}`}
                          checked={env.isDefault}
                          onChange={(e) =>
                            setEnvironments((prev) =>
                              prev.map((p) =>
                                p.id === env.id ? { ...p, isDefault: e.target.checked } : p
                              )
                            )
                          }
                        />
                        <Label htmlFor={`default-${env.id}`} className="text-sm font-normal">
                          Set as default environment
                        </Label>
                      </div>
                      <div className="space-y-2">
                        <Label>Variables</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Use ${'{'}variableName{'}'} in your test steps to substitute values
                        </p>
                        <div className="space-y-2">
                          {parseVariables(env.variables).map((v, i) => (
                            <div key={i} className="flex gap-2">
                              <Input
                                placeholder="Variable name"
                                value={v.key}
                                onChange={(e) => {
                                  const vars = parseVariables(env.variables);
                                  vars[i].key = e.target.value;
                                  setEnvironments((prev) =>
                                    prev.map((p) =>
                                      p.id === env.id ? { ...p, variables: stringifyVariables(vars) } : p
                                    )
                                  );
                                }}
                              />
                              <Input
                                placeholder="Value"
                                value={v.value}
                                onChange={(e) => {
                                  const vars = parseVariables(env.variables);
                                  vars[i].value = e.target.value;
                                  setEnvironments((prev) =>
                                    prev.map((p) =>
                                      p.id === env.id ? { ...p, variables: stringifyVariables(vars) } : p
                                    )
                                  );
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const vars = parseVariables(env.variables).filter((_, idx) => idx !== i);
                                  setEnvironments((prev) =>
                                    prev.map((p) =>
                                      p.id === env.id ? { ...p, variables: stringifyVariables(vars) } : p
                                    )
                                  );
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const vars = parseVariables(env.variables);
                              vars.push({ key: "", value: "" });
                              setEnvironments((prev) =>
                                prev.map((p) =>
                                  p.id === env.id ? { ...p, variables: stringifyVariables(vars) } : p
                                )
                              );
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Variable
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingEnv(null)}>
                          Cancel
                        </Button>
                        <Button onClick={() => updateEnvironment(env.id)}>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{env.name}</span>
                            {env.isDefault && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          {env.description && (
                            <p className="text-sm text-muted-foreground">{env.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {Object.keys(JSON.parse(env.variables || "{}")).length} variables
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingEnv(env.id)}>
                          <Settings2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => deleteEnvironment(env.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Create New Environment */}
              {isCreatingEnv ? (
                <div className="border rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="e.g., Staging, Production"
                        value={newEnv.name}
                        onChange={(e) =>
                          setNewEnv((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Optional description"
                        value={newEnv.description}
                        onChange={(e) =>
                          setNewEnv((prev) => ({ ...prev, description: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="new-default"
                        checked={newEnv.isDefault}
                        onChange={(e) =>
                          setNewEnv((prev) => ({ ...prev, isDefault: e.target.checked }))
                        }
                      />
                      <Label htmlFor="new-default" className="text-sm font-normal">
                        Set as default environment
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Variables</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Use ${'{'}variableName{'}'} in your test steps to substitute values
                      </p>
                      <div className="space-y-2">
                        {newEnv.variables.map((v, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              placeholder="Variable name"
                              value={v.key}
                              onChange={(e) => {
                                const vars = [...newEnv.variables];
                                vars[i].key = e.target.value;
                                setNewEnv((prev) => ({ ...prev, variables: vars }));
                              }}
                            />
                            <Input
                              placeholder="Value"
                              value={v.value}
                              onChange={(e) => {
                                const vars = [...newEnv.variables];
                                vars[i].value = e.target.value;
                                setNewEnv((prev) => ({ ...prev, variables: vars }));
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setNewEnv((prev) => ({
                                  ...prev,
                                  variables: prev.variables.filter((_, idx) => idx !== i),
                                }));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setNewEnv((prev) => ({
                              ...prev,
                              variables: [...prev.variables, { key: "", value: "" }],
                            }))
                          }
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Variable
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreatingEnv(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createEnvironment}>
                        <Check className="h-4 w-4 mr-1" />
                        Create
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setIsCreatingEnv(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Environment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>People with access to this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {member.user.name?.[0] ?? member.user.email[0]}
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.user.name ?? member.user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground capitalize">
                      {member.role.toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Destructive actions that cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Delete Project</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this project and all its tests and runs
                </p>
              </div>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Project</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete &quot;{project.name}&quot;? This
                      action cannot be undone. All tests, runs, and data will be
                      permanently deleted.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
