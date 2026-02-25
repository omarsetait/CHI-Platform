import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Bell,
  Shield,
  Brain,
  Database
} from "lucide-react";

type Theme = "light" | "dark" | "system";

function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || "system";
    }
    return "system";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme: setThemeState };
}

export default function PreAuthSettings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleReset = () => {
    toast({
      title: "Settings reset",
      description: "All settings have been restored to defaults.",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="page-title">
          <SettingsIcon className="w-7 h-7" />
          Pre-Auth Settings
        </h1>
        <p className="text-muted-foreground">
          Configure system preferences and pre-authorization settings
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the application looks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred color scheme
                </p>
              </div>
              <Select value={theme} onValueChange={(v: Theme) => setTheme(v)}>
                <SelectTrigger className="w-[180px]" data-testid="select-theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure alert preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>High Risk Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for high-risk signals
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-high-risk" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Processing Complete</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when pre-auth analysis finishes
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-processing" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Override Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when adjudicator overrides recommendation
                </p>
              </div>
              <Switch data-testid="switch-override" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Agent Settings
            </CardTitle>
            <CardDescription>
              Configure cognitive agent behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Processing</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically start analysis when pre-auths are ingested
                </p>
              </div>
              <Switch data-testid="switch-auto-process" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Confidence Threshold</Label>
                <p className="text-sm text-muted-foreground">
                  Minimum confidence for auto-approval
                </p>
              </div>
              <Select defaultValue="0.85">
                <SelectTrigger className="w-[120px]" data-testid="select-confidence">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.75">75%</SelectItem>
                  <SelectItem value="0.80">80%</SelectItem>
                  <SelectItem value="0.85">85%</SelectItem>
                  <SelectItem value="0.90">90%</SelectItem>
                  <SelectItem value="0.95">95%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>RLHF Learning</Label>
                <p className="text-sm text-muted-foreground">
                  Enable continuous improvement from feedback
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-rlhf" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Safety & Compliance
            </CardTitle>
            <CardDescription>
              Security and regulatory settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Safety Check</Label>
                <p className="text-sm text-muted-foreground">
                  Enforce safety validation before recommendations
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-safety" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Hard Stop Enforcement</Label>
                <p className="text-sm text-muted-foreground">
                  Block processing when regulatory issues detected
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-hard-stop" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Audit Logging</Label>
                <p className="text-sm text-muted-foreground">
                  Record all adjudicator actions
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-audit" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Database and storage settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Retention Period</Label>
                <p className="text-sm text-muted-foreground">
                  How long to keep processed pre-authorizations
                </p>
              </div>
              <Select defaultValue="365">
                <SelectTrigger className="w-[140px]" data-testid="select-retention">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="730">2 years</SelectItem>
                  <SelectItem value="1825">5 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleReset} data-testid="button-reset">
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} data-testid="button-save">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
