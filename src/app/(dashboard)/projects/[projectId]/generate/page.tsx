"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  Sparkles,
  Loader2,
  Globe,
  FileText,
  RefreshCw,
  Save,
  Trash2,
  Wand2,
  GripVertical,
  Edit,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface GeneratedStep {
  type: string;
  description: string;
  config: Record<string, unknown>;
}

interface GeneratedTest {
  name: string;
  description: string;
  steps: GeneratedStep[];
}

export default function AIGeneratePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [mode, setMode] = useState<"description" | "url" | "refine">(
    "description",
  );
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [feedback, setFeedback] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(
    null,
  );
  const [editingName, setEditingName] = useState(false);
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const body: Record<string, unknown> = { projectId };

      if (mode === "description") {
        body.mode = "from_description";
        body.description = description;
      } else if (mode === "url") {
        body.mode = "from_url";
        body.targetUrl = url;
      } else if (mode === "refine" && generatedTest) {
        body.mode = "refine";
        body.feedback = feedback;
        body.existingSteps = generatedTest.steps;
        body.testName = generatedTest.name;
      }

      const res = await fetch("/api/tests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        // API returns { tests: [...] } for from_url, { test: {...} } for others
        const result = data.tests?.[0] || data.test || data;
        setGeneratedTest({
          name: result.name || result.testName || "Generated Test",
          description: result.description || description || "",
          steps: result.steps || [],
        });
        if (mode === "refine") {
          setFeedback("");
          toast.success("Test refined with your feedback");
        } else {
          toast.success("Test generated successfully");
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to generate test");
      }
    } catch {
      toast.error("Failed to generate test");
    }
    setGenerating(false);
  }

  async function handleSave() {
    if (!generatedTest) return;
    setSaving(true);
    try {
      const testRes = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: generatedTest.name,
          description: generatedTest.description,
          projectId,
        }),
      });

      if (testRes.ok) {
        const test = await testRes.json();
        for (const step of generatedTest.steps) {
          await fetch(`/api/tests/${test.id}/steps`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(step),
          });
        }
        toast.success("Test saved successfully");
        router.push(`/projects/${projectId}/tests/${test.id}`);
      } else {
        toast.error("Failed to save test");
      }
    } catch {
      toast.error("Failed to save test");
    }
    setSaving(false);
  }

  function updateStep(index: number, updates: Partial<GeneratedStep>) {
    if (!generatedTest) return;
    const newSteps = [...generatedTest.steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setGeneratedTest({ ...generatedTest, steps: newSteps });
  }

  function removeStep(index: number) {
    if (!generatedTest) return;
    const newSteps = generatedTest.steps.filter((_, i) => i !== index);
    setGeneratedTest({ ...generatedTest, steps: newSteps });
  }

  return (
    <DashboardShell>
      <div className="flex items-center gap-6 mb-10 px-4">
        <Link href={`/projects/${projectId}/tests`}>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-2xl border-border/40 hover:bg-primary/5 hover:text-primary transition-all duration-300 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-4xl font-display font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Test Generator
          </h1>
          <p className="text-lg text-muted-foreground font-medium mt-1">
            Describe what you want to test and let AI create the steps
          </p>
        </div>
        {generatedTest && (
          <Button
            size="lg"
            className="rounded-2xl h-12 px-8 font-bold shadow-lg shadow-primary/20"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="mr-2 h-5 w-5" />
            )}
            Save Test
          </Button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] px-4">
        {/* Input Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-border/40 bg-card/40 backdrop-blur-xl rounded-[2rem] shadow-elegant overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                Generation Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as typeof mode)}
                className="space-y-6"
              >
                <TabsList className="grid grid-cols-3 rounded-2xl bg-muted/50 p-1">
                  <TabsTrigger
                    value="description"
                    className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Describe
                  </TabsTrigger>
                  <TabsTrigger
                    value="url"
                    className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Globe className="mr-1.5 h-3.5 w-3.5" />
                    From URL
                  </TabsTrigger>
                  <TabsTrigger
                    value="refine"
                    disabled={!generatedTest}
                    className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Refine
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="description" className="space-y-6 mt-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                      Test Description
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the user flow you want to test, e.g.: 'Test the signup flow — navigate to the signup page, fill in email and password, click submit, and verify the welcome message appears'"
                      rows={8}
                      className="rounded-2xl border-border/40 bg-background/50 p-4 text-base focus-visible:ring-primary/20 min-h-[200px]"
                    />
                  </div>
                  <Button
                    size="lg"
                    className="rounded-2xl h-12 px-8 font-bold w-full"
                    onClick={handleGenerate}
                    disabled={generating || !description.trim()}
                  >
                    {generating ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2 h-5 w-5" />
                    )}
                    Generate Test
                  </Button>
                </TabsContent>

                <TabsContent value="url" className="space-y-6 mt-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                      Page URL
                    </Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://your-app.com/login"
                      className="rounded-xl border-border/40 bg-background/50 h-12 px-4 focus-visible:ring-primary/20"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground/60 px-1">
                    AI will analyze the page structure and generate
                    comprehensive test scenarios
                  </p>
                  <Button
                    size="lg"
                    className="rounded-2xl h-12 px-8 font-bold w-full"
                    onClick={handleGenerate}
                    disabled={generating || !url.trim()}
                  >
                    {generating ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Globe className="mr-2 h-5 w-5" />
                    )}
                    Analyze &amp; Generate
                  </Button>
                </TabsContent>

                <TabsContent value="refine" className="space-y-6 mt-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                      Refinement Feedback
                    </Label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="e.g., 'Add a step to check for error messages after submitting an empty form' or 'Replace the CSS selectors with AI-powered targeting'"
                      rows={6}
                      className="rounded-2xl border-border/40 bg-background/50 p-4 text-base focus-visible:ring-primary/20 min-h-[160px]"
                    />
                  </div>
                  <Button
                    size="lg"
                    className="rounded-2xl h-12 px-8 font-bold w-full"
                    onClick={handleGenerate}
                    disabled={generating || !feedback.trim()}
                  >
                    {generating ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-5 w-5" />
                    )}
                    Refine Test
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-border/40 bg-card/40 backdrop-blur-xl rounded-[2rem] shadow-elegant overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {generatedTest ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    {editingName ? (
                      <Input
                        value={generatedTest.name}
                        onChange={(e) =>
                          setGeneratedTest({
                            ...generatedTest,
                            name: e.target.value,
                          })
                        }
                        onBlur={() => setEditingName(false)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && setEditingName(false)
                        }
                        autoFocus
                        className="text-2xl font-display font-bold tracking-tight h-auto py-1 bg-transparent border-none focus-visible:ring-0 px-0"
                      />
                    ) : (
                      <h2
                        className="text-2xl font-display font-bold tracking-tight cursor-pointer hover:text-primary transition-colors flex items-center gap-2 group"
                        onClick={() => setEditingName(true)}
                      >
                        {generatedTest.name}
                        <Edit className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h2>
                    )}
                    {generatedTest.description && (
                      <p className="text-sm text-muted-foreground font-medium">
                        {generatedTest.description}
                      </p>
                    )}
                  </div>

                  <Separator className="bg-border/20" />

                  <ScrollArea className="h-[450px]">
                    <div className="space-y-3 pr-4">
                      {generatedTest.steps.map((step, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-background/50 group hover:border-primary/20 transition-all duration-300"
                        >
                          <span className="text-[10px] font-black text-muted-foreground/30 tabular-nums tracking-widest w-6 text-center">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <Badge
                            variant="outline"
                            className="rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 px-2 py-0.5"
                          >
                            {step.type}
                          </Badge>
                          {editingStepIdx === index ? (
                            <Input
                              value={step.description}
                              onChange={(e) =>
                                updateStep(index, {
                                  description: e.target.value,
                                })
                              }
                              onBlur={() => setEditingStepIdx(null)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && setEditingStepIdx(null)
                              }
                              autoFocus
                              className="flex-1 h-8 text-sm bg-transparent border-none focus-visible:ring-0 px-0"
                            />
                          ) : (
                            <span
                              className="flex-1 text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors"
                              onClick={() => setEditingStepIdx(index)}
                            >
                              {step.description}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                            onClick={() => removeStep(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground/50 font-bold">
                      {generatedTest.steps.length} steps — click to edit, drag
                      to reorder
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                  <div className="p-5 rounded-3xl bg-primary/5 text-primary/20">
                    <Sparkles className="h-12 w-12" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-muted-foreground/60">
                      No Test Generated Yet
                    </p>
                    <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto mt-1">
                      Describe your test scenario or provide a URL and let AI
                      create the test steps for you
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardShell>
  );
}
