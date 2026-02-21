"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Key, Bell, Shield, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // This is a placeholder - in a real app you'd fetch the user's profile
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    // Placeholder - would call API to update profile
    await new Promise((resolve) => setTimeout(resolve, 500));

    toast.success("Profile updated", {
      description: "Your profile has been updated successfully.",
    });

    setIsLoading(false);
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
          <Link href="/projects" className="hover:text-foreground transition-colors font-medium">
            Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-semibold">Settings</span>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-display font-normal tracking-tight mb-3">Settings</h1>
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
                  <Label htmlFor="name" className="font-semibold">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="rounded-xl h-12 border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="rounded-xl h-12 border-border/50"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="rounded-full px-6 h-11 font-semibold">
                  {isLoading ? "Saving..." : "Save Changes"}
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
              <div className="rounded-xl border border-border/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Anthropic API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Used for AI-powered test steps
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full px-4">
                    Configure
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">OpenAI API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Fallback AI provider
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full px-4">
                    Configure
                  </Button>
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
                <CardTitle className="font-display text-xl">Notifications</CardTitle>
              </div>
              <CardDescription className="text-base mt-2">
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
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
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Change Password</p>
                  <p className="text-sm text-muted-foreground">
                    Update your account password
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full px-4">
                  Change
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-destructive">Danger Zone</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account
                  </p>
                </div>
                <Button variant="destructive" size="sm" className="rounded-full px-4">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </DashboardShell>
  );
}
