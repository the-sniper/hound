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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  Timer,
  Webhook,
  Plus,
  Loader2,
  Trash2,
  Edit,
  Clock,
  Globe,
  Zap,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface Schedule {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  timezone: string;
  testIds: string[];
  environmentId: string | null;
  region: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  events: string[];
  headers: Record<string, string>;
  enabled: boolean;
  secret: string | null;
  createdAt: string;
}

interface Test {
  id: string;
  name: string;
}

interface Environment {
  id: string;
  name: string;
}

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 6 AM", value: "0 6 * * *" },
  { label: "Weekly (Monday)", value: "0 0 * * 1" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
];

const WEBHOOK_EVENTS = [
  { id: "run_passed", label: "Run Passed" },
  { id: "run_failed", label: "Run Failed" },
  { id: "run_error", label: "Run Error" },
  { id: "*", label: "All Events" },
];

export default function MonitoringPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule form
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    cronExpression: "0 0 * * *",
    timezone: "UTC",
    testIds: [] as string[],
    environmentId: "",
    region: "",
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Webhook form
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookEntry | null>(null);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: ["run_failed"] as string[],
    secret: "",
    headers: "{}",
  });
  const [savingWebhook, setSavingWebhook] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    try {
      const [schedulesRes, webhooksRes, testsRes, envsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/schedules`),
        fetch(`/api/projects/${projectId}/webhooks`),
        fetch(`/api/tests?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}/environments`),
      ]);

      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(Array.isArray(data) ? data : data.schedules || []);
      }
      if (webhooksRes.ok) {
        const data = await webhooksRes.json();
        setWebhooks(Array.isArray(data) ? data : data.webhooks || []);
      }
      if (testsRes.ok) {
        const data = await testsRes.json();
        setTests(Array.isArray(data) ? data : data.tests || []);
      }
      if (envsRes.ok) {
        const data = await envsRes.json();
        setEnvironments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load monitoring data:", error);
    }
    setLoading(false);
  }

  async function handleSaveSchedule() {
    setSavingSchedule(true);
    try {
      const url = editingSchedule
        ? `/api/projects/${projectId}/schedules/${editingSchedule.id}`
        : `/api/projects/${projectId}/schedules`;
      const method = editingSchedule ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scheduleForm,
          testIds: scheduleForm.testIds,
          environmentId: scheduleForm.environmentId || null,
          region: scheduleForm.region || null,
        }),
      });

      if (res.ok) {
        toast.success(editingSchedule ? "Schedule updated" : "Schedule created");
        setScheduleDialogOpen(false);
        resetScheduleForm();
        await loadData();
      } else {
        toast.error("Failed to save schedule");
      }
    } catch {
      toast.error("Failed to save schedule");
    }
    setSavingSchedule(false);
  }

  async function handleDeleteSchedule(id: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/schedules/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Schedule deleted");
        setSchedules(schedules.filter((s) => s.id !== id));
      }
    } catch {
      toast.error("Failed to delete schedule");
    }
  }

  async function handleToggleSchedule(id: string, enabled: boolean) {
    try {
      await fetch(`/api/projects/${projectId}/schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      setSchedules(schedules.map((s) => (s.id === id ? { ...s, enabled } : s)));
    } catch {
      toast.error("Failed to toggle schedule");
    }
  }

  async function handleSaveWebhook() {
    setSavingWebhook(true);
    try {
      let headers: Record<string, string> = {};
      try { headers = JSON.parse(webhookForm.headers); } catch {}

      const url = editingWebhook
        ? `/api/projects/${projectId}/webhooks/${editingWebhook.id}`
        : `/api/projects/${projectId}/webhooks`;
      const method = editingWebhook ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: webhookForm.name,
          url: webhookForm.url,
          events: webhookForm.events,
          secret: webhookForm.secret || null,
          headers,
        }),
      });

      if (res.ok) {
        toast.success(editingWebhook ? "Webhook updated" : "Webhook created");
        setWebhookDialogOpen(false);
        resetWebhookForm();
        await loadData();
      } else {
        toast.error("Failed to save webhook");
      }
    } catch {
      toast.error("Failed to save webhook");
    }
    setSavingWebhook(false);
  }

  async function handleDeleteWebhook(id: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Webhook deleted");
        setWebhooks(webhooks.filter((w) => w.id !== id));
      }
    } catch {
      toast.error("Failed to delete webhook");
    }
  }

  async function handleToggleWebhook(id: string, enabled: boolean) {
    try {
      await fetch(`/api/projects/${projectId}/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, enabled } : w)));
    } catch {
      toast.error("Failed to toggle webhook");
    }
  }

  function resetScheduleForm() {
    setEditingSchedule(null);
    setScheduleForm({ name: "", cronExpression: "0 0 * * *", timezone: "UTC", testIds: [], environmentId: "", region: "" });
  }

  function resetWebhookForm() {
    setEditingWebhook(null);
    setWebhookForm({ name: "", url: "", events: ["run_failed"], secret: "", headers: "{}" });
  }

  function openEditSchedule(schedule: Schedule) {
    setEditingSchedule(schedule);
    setScheduleForm({
      name: schedule.name,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      testIds: schedule.testIds || [],
      environmentId: schedule.environmentId || "",
      region: schedule.region || "",
    });
    setScheduleDialogOpen(true);
  }

  function openEditWebhook(webhook: WebhookEntry) {
    setEditingWebhook(webhook);
    setWebhookForm({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events || ["run_failed"],
      secret: webhook.secret || "",
      headers: JSON.stringify(webhook.headers || {}, null, 2),
    });
    setWebhookDialogOpen(true);
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex items-center gap-6 mb-10 px-4">
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-border/40 hover:bg-primary/5 hover:text-primary transition-all duration-300 shadow-sm">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-4xl font-display font-bold tracking-tight flex items-center gap-3">
            <Timer className="h-8 w-8 text-primary" />
            Monitoring
          </h1>
          <p className="text-lg text-muted-foreground font-medium mt-1">
            Schedules, webhooks, and alerting
          </p>
        </div>
      </div>

      <div className="px-4">
        <Tabs defaultValue="schedules" className="space-y-6">
          <TabsList className="rounded-2xl bg-muted/50 p-1">
            <TabsTrigger value="schedules" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Schedules ({schedules.length})
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Webhooks ({webhooks.length})
            </TabsTrigger>
          </TabsList>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={scheduleDialogOpen} onOpenChange={(open) => { setScheduleDialogOpen(open); if (!open) resetScheduleForm(); }}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    New Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg rounded-[2rem] border-border/40 bg-card/95 backdrop-blur-xl">
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl font-bold">
                      {editingSchedule ? "Edit Schedule" : "Create Schedule"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={scheduleForm.name} onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })} placeholder="e.g., Nightly regression" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cron Expression</Label>
                      <div className="flex gap-2">
                        <Input value={scheduleForm.cronExpression} onChange={(e) => setScheduleForm({ ...scheduleForm, cronExpression: e.target.value })} placeholder="0 0 * * *" className="rounded-xl font-mono text-sm flex-1" />
                        <Select onValueChange={(v) => setScheduleForm({ ...scheduleForm, cronExpression: v })}>
                          <SelectTrigger className="rounded-xl w-[180px]">
                            <SelectValue placeholder="Presets" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {CRON_PRESETS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Tests</Label>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto rounded-xl border border-border/40 p-3">
                        {tests.map((test) => (
                          <div key={test.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`test-${test.id}`}
                              checked={scheduleForm.testIds.includes(test.id)}
                              onCheckedChange={(checked) => {
                                const ids = checked
                                  ? [...scheduleForm.testIds, test.id]
                                  : scheduleForm.testIds.filter((id) => id !== test.id);
                                setScheduleForm({ ...scheduleForm, testIds: ids });
                              }}
                            />
                            <Label htmlFor={`test-${test.id}`} className="text-sm cursor-pointer">{test.name}</Label>
                          </div>
                        ))}
                        {tests.length === 0 && <p className="text-sm text-muted-foreground">No tests found</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Environment</Label>
                        <Select value={scheduleForm.environmentId} onValueChange={(v) => setScheduleForm({ ...scheduleForm, environmentId: v })}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Default" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="default">Default</SelectItem>
                            {environments.map((env) => (
                              <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Region</Label>
                        <Select value={scheduleForm.region} onValueChange={(v) => setScheduleForm({ ...scheduleForm, region: v })}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Auto" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="auto">Auto</SelectItem>
                            <SelectItem value="us-east-1">US East</SelectItem>
                            <SelectItem value="us-west-2">US West</SelectItem>
                            <SelectItem value="eu-west-1">EU West</SelectItem>
                            <SelectItem value="eu-central-1">EU Central</SelectItem>
                            <SelectItem value="ap-southeast-1">Asia Pacific</SelectItem>
                            <SelectItem value="ap-northeast-1">Japan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button onClick={handleSaveSchedule} disabled={savingSchedule || !scheduleForm.name.trim()}>
                      {savingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      {editingSchedule ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {schedules.length === 0 ? (
              <Card className="border-dashed border-2 rounded-[2rem]">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Clock className="h-10 w-10 text-muted-foreground/20 mb-4" />
                  <p className="text-lg font-bold text-muted-foreground/60">No schedules yet</p>
                  <p className="text-sm text-muted-foreground/40 mt-1">Create a schedule to run tests automatically</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule, i) => (
                  <motion.div key={schedule.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="rounded-2xl border-border/40 bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-300">
                      <CardContent className="flex items-center gap-4 p-5">
                        <Switch checked={schedule.enabled} onCheckedChange={(checked) => handleToggleSchedule(schedule.id, checked)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{schedule.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{schedule.cronExpression}</p>
                        </div>
                        <div className="text-right space-y-1 shrink-0">
                          {schedule.nextRunAt && (
                            <p className="text-xs text-muted-foreground">Next: {new Date(schedule.nextRunAt).toLocaleString()}</p>
                          )}
                          {schedule.lastRunAt && (
                            <p className="text-[10px] text-muted-foreground/60">Last: {new Date(schedule.lastRunAt).toLocaleString()}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="rounded-lg text-[10px] shrink-0">
                          {(schedule.testIds || []).length} tests
                        </Badge>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10" onClick={() => openEditSchedule(schedule)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteSchedule(schedule.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={webhookDialogOpen} onOpenChange={(open) => { setWebhookDialogOpen(open); if (!open) resetWebhookForm(); }}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    New Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg rounded-[2rem] border-border/40 bg-card/95 backdrop-blur-xl">
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl font-bold">
                      {editingWebhook ? "Edit Webhook" : "Create Webhook"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={webhookForm.name} onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })} placeholder="e.g., Slack notifications" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>URL</Label>
                      <Input value={webhookForm.url} onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })} placeholder="https://hooks.slack.com/..." className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Events</Label>
                      <div className="space-y-2">
                        {WEBHOOK_EVENTS.map((event) => (
                          <div key={event.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`event-${event.id}`}
                              checked={webhookForm.events.includes(event.id)}
                              onCheckedChange={(checked) => {
                                const events = checked
                                  ? [...webhookForm.events, event.id]
                                  : webhookForm.events.filter((e) => e !== event.id);
                                setWebhookForm({ ...webhookForm, events });
                              }}
                            />
                            <Label htmlFor={`event-${event.id}`} className="text-sm cursor-pointer">{event.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secret (optional)</Label>
                      <Input value={webhookForm.secret} onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })} placeholder="HMAC signing secret" className="rounded-xl" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label>Headers (JSON, optional)</Label>
                      <Textarea value={webhookForm.headers} onChange={(e) => setWebhookForm({ ...webhookForm, headers: e.target.value })} placeholder='{"Authorization": "Bearer ..."}' rows={3} className="rounded-xl font-mono text-xs" />
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button onClick={handleSaveWebhook} disabled={savingWebhook || !webhookForm.name.trim() || !webhookForm.url.trim()}>
                      {savingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      {editingWebhook ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {webhooks.length === 0 ? (
              <Card className="border-dashed border-2 rounded-[2rem]">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Zap className="h-10 w-10 text-muted-foreground/20 mb-4" />
                  <p className="text-lg font-bold text-muted-foreground/60">No webhooks yet</p>
                  <p className="text-sm text-muted-foreground/40 mt-1">Add a webhook to receive notifications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook, i) => (
                  <motion.div key={webhook.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="rounded-2xl border-border/40 bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-300">
                      <CardContent className="flex items-center gap-4 p-5">
                        <Switch checked={webhook.enabled} onCheckedChange={(checked) => handleToggleWebhook(webhook.id, checked)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{webhook.name}</p>
                          <p className="text-xs font-mono text-muted-foreground truncate">{webhook.url}</p>
                        </div>
                        <div className="flex gap-1 flex-wrap shrink-0">
                          {(webhook.events || []).map((evt) => (
                            <Badge key={evt} variant="outline" className="rounded-md text-[9px] px-1.5">{evt}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10" onClick={() => openEditWebhook(webhook)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteWebhook(webhook.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
