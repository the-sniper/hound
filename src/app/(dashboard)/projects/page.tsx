"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FlaskConical, Play, FolderKanban, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Project {
  id: string;
  name: string;
  baseUrl: string;
  description: string | null;
  createdAt: string;
  _count: { tests: number; runs: number };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      setProjects(await res.json());
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        baseUrl: formData.get("baseUrl"),
        description: formData.get("description") || undefined,
      }),
    });

    if (res.ok) {
      toast.success("Project created");
      setDialogOpen(false);
      fetchProjects();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create project");
    }
    setCreating(false);
  }

  return (
    <DashboardShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-end justify-between mb-12">
          <div>
            <h1 className="text-5xl font-display tracking-tight text-foreground/90 mb-2">Projects</h1>
            <p className="text-muted-foreground font-medium text-lg">
              Your AI-powered test suites
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full px-8 py-6 text-base font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
                <Plus className="mr-2 h-5 w-5" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] border-border/40 shadow-glass">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Create Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold">Project Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="My Website"
                    required
                    className="rounded-xl h-12 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseUrl" className="font-semibold">Base URL</Label>
                  <Input
                    id="baseUrl"
                    name="baseUrl"
                    type="url"
                    placeholder="https://example.com"
                    required
                    className="rounded-xl h-12 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-semibold">Description (optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="What does this project test?"
                    className="rounded-xl border-border/50"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full h-11 font-semibold" disabled={creating}>
                  {creating ? "Creating..." : "Create Project"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm font-semibold text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent shadow-none hover:translate-y-0 rounded-[2rem]">
            <CardContent className="flex flex-col items-center justify-center py-24">
              <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-8 rotate-3">
                <FolderKanban className="h-10 w-10 text-primary/40" />
              </div>
              <p className="text-3xl font-display font-normal tracking-tight mb-3">No projects yet</p>
              <p className="text-muted-foreground mb-10 text-center max-w-sm leading-relaxed">
                Create your first project to start authoring and running AI-powered tests with natural language.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="rounded-2xl px-10 py-6 text-base font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                <Plus className="mr-2 h-5 w-5" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {projects.map((project) => (
              <Link 
                key={project.id} 
                href={`/projects/${project.id}`}
                className="group relative transition-all duration-700 col-span-12 md:col-span-6 lg:col-span-4"
              >
                <Card className="h-full min-h-[300px] overflow-hidden border-border/30 shadow-elegant backdrop-blur-xl bg-card/40 hover:bg-card hover:border-primary/20 rounded-[2.5rem] transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2">
                  <div className="absolute top-0 right-0 p-10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <CardHeader className="p-10">
                    <div className="flex items-center gap-5 mb-6">
                      <div className="h-14 w-14 rounded-[1.25rem] bg-primary/5 flex items-center justify-center text-primary group-hover:rotate-6 transition-all duration-700">
                        <FolderKanban className="h-7 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-3xl font-display tracking-tight group-hover:text-primary transition-colors">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-[0.2em] text-primary/40 mt-1.5">
                          {new URL(project.baseUrl).hostname}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="px-10 pb-10">
                    {project.description && (
                      <p className="text-muted-foreground/70 mb-10 line-clamp-2 leading-relaxed text-lg font-medium italic">
                        &ldquo;{project.description}&rdquo;
                      </p>
                    )}
                    
                    <div className="flex items-center gap-10">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-3xl font-display">{project._count.tests}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Test Suites</span>
                      </div>
                      <div className="h-10 w-px bg-primary/10" />
                      <div className="flex flex-col gap-1.5">
                        <span className="text-3xl font-display">{project._count.runs}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Executions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </DashboardShell>
  );
}
