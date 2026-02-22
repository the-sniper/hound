"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  User,
  Key,
  Bell,
  Shield,
  ChevronRight,
  Loader2,
  Check,
  Eye,
  EyeOff,
  BarChart3,
  Zap,
  FolderKanban,
  FlaskConical,
  Play,
} from "lucide-react";
import Link from "next/link";

interface UserSettings {
  id: string;
  name: string | null;
  email: string;
  anthropicKeyMasked: string | null;
  openaiKeyMasked: string | null;
  hasAnthropicKey: boolean;
  hasOpenAIKey: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const [keyFormData, setKeyFormData] = useState({
    anthropicKey: "",
    openaiKey: "",
  });

  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Usage state
  const [usage, setUsage] = useState<{
    tier: string;
    runsThisMonth: number;
    runLimit: number;
    testsCount: number;
    projectsCount: number;
  } | null>(null);

  useEffect(() => {
    loadSettings();
    loadUsage();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
        });
      }
    } catch (error) {
      toast.error("Failed to load settings");
    }
    setIsLoading(false);
  }

  async function loadUsage() {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage({
          tier: data.tier || "free",
          runsThisMonth: data.runsThisMonth || 0,
          runLimit: data.runLimit || data.limit || 100,
          testsCount: data.testsCount || 0,
          projectsCount: data.projectsCount || 0,
        });
      }
    } catch {
      // Usage endpoint may not exist yet
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings((prev) =>
          prev ? { ...prev, name: data.name, email: data.email } : null,
        );
        toast.success("Profile updated");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    }

    setIsSaving(false);
  }

  async function handleUpdateKey(
    provider: "anthropic" | "openai",
    key: string,
  ) {
    setIsSaving(true);
    try {
      const field = provider === "anthropic" ? "anthropicKey" : "openaiKey";
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: key }),
      });

      if (res.ok) {
        toast.success(
          `${provider === "anthropic" ? "Anthropic" : "OpenAI"} API key updated`,
        );
        loadSettings(); // Reload to get masked keys and status
        setKeyFormData((prev) => ({ ...prev, [field]: "" }));
      } else {
        toast.error("Failed to update API key");
      }
    } catch (error) {
      toast.error("Failed to update API key");
    }
    setIsSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordFormData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordFormData.currentPassword,
          newPassword: passwordFormData.newPassword,
        }),
      });

      if (res.ok) {
        toast.success("Password updated successfully");
        setPasswordFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordDialogOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update password");
      }
    } catch (error) {
      toast.error("Failed to update password");
    }
    setIsSaving(false);
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
          <span className="text-foreground font-semibold">Settings</span>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-display font-normal tracking-tight mb-3">
            Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Profile Settings */}
          <Card className="rounded-[2rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="font-display text-xl">Profile</CardTitle>
              </div>
              <CardDescription className="text-base mt-2">
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/60"
                  >
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Your name"
                    className="rounded-xl h-12 border-border/50 bg-background/50 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/60"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="your@email.com"
                    className="rounded-xl h-12 border-border/50 bg-background/50 focus:ring-primary/20"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSaving || isLoading}
                  className="rounded-full px-6 h-11 font-bold shadow-lg shadow-primary/20"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card className="rounded-[2rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="font-display text-xl">API Keys</CardTitle>
              </div>
              <CardDescription className="text-base mt-2">
                Manage your API keys for external integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Anthropic Key */}
              <div className="rounded-2xl border border-border/40 p-5 bg-background/40 backdrop-blur-sm group hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">
                        Anthropic API Key
                      </p>
                      {settings?.hasAnthropicKey && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-[10px] font-black uppercase tracking-widest">
                          <Check className="h-3 w-3" /> Configured
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground/60 font-medium">
                      Used for AI-powered test steps (Claude models)
                    </p>
                    {settings?.hasAnthropicKey && (
                      <p className="text-xs font-mono text-muted-foreground/40 mt-1">
                        Current: {settings.anthropicKeyMasked}
                      </p>
                    )}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-4 font-bold border-border/60 hover:border-primary hover:text-primary transition-all shadow-sm"
                      >
                        {settings?.hasAnthropicKey ? "Update" : "Configure"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl border-border/40 bg-popover/90 backdrop-blur-2xl">
                      <DialogHeader>
                        <DialogTitle>Configure Anthropic Key</DialogTitle>
                        <DialogDescription>
                          Enter your Anthropic API key. It will be used securely
                          to power AI features.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="anthropicKey">API Key</Label>
                          <div className="relative">
                            <Input
                              id="anthropicKey"
                              type={showAnthropicKey ? "text" : "password"}
                              value={keyFormData.anthropicKey}
                              onChange={(e) =>
                                setKeyFormData((prev) => ({
                                  ...prev,
                                  anthropicKey: e.target.value,
                                }))
                              }
                              placeholder="sk-ant-..."
                              className="rounded-xl border-border/50 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowAnthropicKey(!showAnthropicKey)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showAnthropicKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          className="rounded-full px-6 font-bold"
                          onClick={() =>
                            handleUpdateKey(
                              "anthropic",
                              keyFormData.anthropicKey,
                            )
                          }
                          disabled={!keyFormData.anthropicKey || isSaving}
                        >
                          {isSaving && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          )}
                          Save Key
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* OpenAI Key */}
              <div className="rounded-2xl border border-border/40 p-5 bg-background/40 backdrop-blur-sm group hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground">
                        OpenAI API Key
                      </p>
                      {settings?.hasOpenAIKey && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 text-[10px] font-black uppercase tracking-widest">
                          <Check className="h-3 w-3" /> Configured
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground/60 font-medium">
                      Fallback or alternative AI provider (GPT-4o)
                    </p>
                    {settings?.hasOpenAIKey && (
                      <p className="text-xs font-mono text-muted-foreground/40 mt-1">
                        Current: {settings.openaiKeyMasked}
                      </p>
                    )}
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl px-4 font-bold border-border/60 hover:border-primary hover:text-primary transition-all shadow-sm"
                      >
                        {settings?.hasOpenAIKey ? "Update" : "Configure"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl border-border/40 bg-popover/90 backdrop-blur-2xl">
                      <DialogHeader>
                        <DialogTitle>Configure OpenAI Key</DialogTitle>
                        <DialogDescription>
                          Enter your OpenAI API key. This will be used as a
                          fallback for AI features.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="openaiKey">API Key</Label>
                          <div className="relative">
                            <Input
                              id="openaiKey"
                              type={showOpenAIKey ? "text" : "password"}
                              value={keyFormData.openaiKey}
                              onChange={(e) =>
                                setKeyFormData((prev) => ({
                                  ...prev,
                                  openaiKey: e.target.value,
                                }))
                              }
                              placeholder="sk-..."
                              className="rounded-xl border-border/50 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showOpenAIKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          className="rounded-full px-6 font-bold"
                          onClick={() =>
                            handleUpdateKey("openai", keyFormData.openaiKey)
                          }
                          disabled={!keyFormData.openaiKey || isSaving}
                        >
                          {isSaving && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          )}
                          Save Key
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="rounded-[2rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="font-display text-xl">
                  Notifications
                </CardTitle>
              </div>
              <CardDescription className="text-base mt-2">
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-bold text-muted-foreground/40 uppercase tracking-widest bg-muted/30 p-8 rounded-2xl text-center">
                Notification settings coming soon
              </p>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="rounded-[2rem] border-border/40 shadow-glass backdrop-blur-xl bg-card/40">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="font-display text-xl">Security</CardTitle>
              </div>
              <CardDescription className="text-base mt-2">
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-2">
                <div>
                  <p className="font-bold">Change Password</p>
                  <p className="text-sm text-muted-foreground/60 font-medium leading-relaxed">
                    Update your account password
                  </p>
                </div>
                <Dialog
                  open={passwordDialogOpen}
                  onOpenChange={setPasswordDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl px-4 font-bold border-border/60 hover:border-primary hover:text-primary transition-all shadow-sm"
                    >
                      Change
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-3xl border-border/40 bg-popover/90 backdrop-blur-2xl">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={handleChangePassword}
                      className="space-y-4 py-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">
                          Current Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordFormData.currentPassword}
                            onChange={(e) =>
                              setPasswordFormData((prev) => ({
                                ...prev,
                                currentPassword: e.target.value,
                              }))
                            }
                            placeholder="••••••••"
                            className="rounded-xl border-border/50 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordFormData.newPassword}
                            onChange={(e) =>
                              setPasswordFormData((prev) => ({
                                ...prev,
                                newPassword: e.target.value,
                              }))
                            }
                            placeholder="Min 8 characters"
                            className="rounded-xl border-border/50 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordFormData.confirmPassword}
                            onChange={(e) =>
                              setPasswordFormData((prev) => ({
                                ...prev,
                                confirmPassword: e.target.value,
                              }))
                            }
                            placeholder="Confirm your new password"
                            className="rounded-xl border-border/50 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <DialogFooter className="pt-4">
                        <Button
                          type="submit"
                          className="rounded-full px-6 font-bold"
                          disabled={isSaving}
                        >
                          {isSaving && (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          )}
                          Update Password
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Separator className="bg-border/20" />
              <div className="flex items-center justify-between p-2">
                <div>
                  <p className="font-bold text-destructive">Danger Zone</p>
                  <p className="text-sm text-muted-foreground/60 font-medium leading-relaxed">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-xl px-4 font-bold shadow-lg shadow-destructive/10"
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Usage & Billing */}
          <Card className="rounded-[2.5rem] border-border/40 bg-card/40 backdrop-blur-xl shadow-elegant overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/5">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-display font-bold tracking-tight">
                    Usage &amp; Plan
                  </CardTitle>
                  <CardDescription className="text-sm font-medium text-muted-foreground/60 mt-0.5">
                    Current usage and subscription details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              {usage ? (
                <>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-primary/80">Current Plan</p>
                      <p className="text-2xl font-display font-bold capitalize">{usage.tier}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-foreground/60">Runs This Month</span>
                      <span className="text-sm font-bold">
                        {usage.runsThisMonth} / {usage.runLimit === -1 ? "Unlimited" : usage.runLimit}
                      </span>
                    </div>
                    {usage.runLimit !== -1 && (
                      <Progress
                        value={Math.min((usage.runsThisMonth / usage.runLimit) * 100, 100)}
                        className="h-2 rounded-full"
                      />
                    )}
                    {usage.runLimit !== -1 && usage.runsThisMonth / usage.runLimit > 0.8 && (
                      <p className="text-xs text-amber-600 font-bold">
                        You&apos;re approaching your monthly run limit
                      </p>
                    )}
                  </div>

                  <Separator className="bg-border/20" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50">
                      <FolderKanban className="h-4 w-4 text-muted-foreground/50" />
                      <div>
                        <p className="text-xs text-muted-foreground/50 font-bold">Projects</p>
                        <p className="text-lg font-bold">{usage.projectsCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50">
                      <FlaskConical className="h-4 w-4 text-muted-foreground/50" />
                      <div>
                        <p className="text-xs text-muted-foreground/50 font-bold">Tests</p>
                        <p className="text-lg font-bold">{usage.testsCount}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Loading usage data...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </DashboardShell>
  );
}
