import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Settings,
  Bell,
  Clock,
  Mail,
  Database,
  Shield,
  Save,
} from "lucide-react";

export default function ClaimsGovernanceSettings() {
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    highRiskAlerts: true,
    dailyDigest: true,
    weeklyReport: true,
  });

  const [processing, setProcessing] = useState({
    autoProcess: true,
    batchSize: "100",
    retentionDays: "90",
    timeZone: "Asia/Riyadh",
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-settings">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Claims Governance Settings</h1>
          <p className="text-muted-foreground">
            Configure general settings for the claims governance module
          </p>
        </div>
        <Button data-testid="button-save">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure alert and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Alerts</Label>
                <p className="text-xs text-muted-foreground">Receive email notifications for claims events</p>
              </div>
              <Switch
                checked={notifications.emailAlerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, emailAlerts: checked })}
                data-testid="switch-email-alerts"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>High-Risk Alerts</Label>
                <p className="text-xs text-muted-foreground">Immediate alerts for high-risk claim detection</p>
              </div>
              <Switch
                checked={notifications.highRiskAlerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, highRiskAlerts: checked })}
                data-testid="switch-high-risk-alerts"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Daily Digest</Label>
                <p className="text-xs text-muted-foreground">Daily summary of claims activity</p>
              </div>
              <Switch
                checked={notifications.dailyDigest}
                onCheckedChange={(checked) => setNotifications({ ...notifications, dailyDigest: checked })}
                data-testid="switch-daily-digest"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Weekly Report</Label>
                <p className="text-xs text-muted-foreground">Comprehensive weekly claims report</p>
              </div>
              <Switch
                checked={notifications.weeklyReport}
                onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                data-testid="switch-weekly-report"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Processing
            </CardTitle>
            <CardDescription>
              Configure processing and automation settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Processing</Label>
                <p className="text-xs text-muted-foreground">Automatically process incoming claims</p>
              </div>
              <Switch
                checked={processing.autoProcess}
                onCheckedChange={(checked) => setProcessing({ ...processing, autoProcess: checked })}
                data-testid="switch-auto-process"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Batch Size</Label>
              <Select
                value={processing.batchSize}
                onValueChange={(value) => setProcessing({ ...processing, batchSize: value })}
              >
                <SelectTrigger data-testid="select-batch-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 claims</SelectItem>
                  <SelectItem value="100">100 claims</SelectItem>
                  <SelectItem value="200">200 claims</SelectItem>
                  <SelectItem value="500">500 claims</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Number of claims to process per batch</p>
            </div>
            <div className="space-y-2">
              <Label>Time Zone</Label>
              <Select
                value={processing.timeZone}
                onValueChange={(value) => setProcessing({ ...processing, timeZone: value })}
              >
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Riyadh">Asia/Riyadh (GMT+3)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Data Retention
            </CardTitle>
            <CardDescription>
              Configure data storage and retention policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Retention Period</Label>
              <Select
                value={processing.retentionDays}
                onValueChange={(value) => setProcessing({ ...processing, retentionDays: value })}
              >
                <SelectTrigger data-testid="select-retention">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How long to retain claims data</p>
            </div>
            <Separator />
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Storage</span>
                <span className="text-sm text-muted-foreground">3.8 GB / 20 GB</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[19%]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Configuration
            </CardTitle>
            <CardDescription>
              Configure email recipients for alerts and reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Email</Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                defaultValue="claims-team@tachyhealth.com"
                data-testid="input-primary-email"
              />
            </div>
            <div className="space-y-2">
              <Label>CC Recipients</Label>
              <Input
                type="email"
                placeholder="Comma-separated emails"
                defaultValue="compliance@tachyhealth.com, audit@tachyhealth.com"
                data-testid="input-cc-emails"
              />
              <p className="text-xs text-muted-foreground">Additional recipients for claims alerts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Configure security and access control settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">Require 2FA for sensitive actions</p>
                </div>
                <Switch defaultChecked data-testid="switch-2fa" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Audit Logging</Label>
                  <p className="text-xs text-muted-foreground">Log all user actions for compliance</p>
                </div>
                <Switch defaultChecked data-testid="switch-audit-log" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>IP Whitelisting</Label>
                  <p className="text-xs text-muted-foreground">Restrict access to approved IPs</p>
                </div>
                <Switch data-testid="switch-ip-whitelist" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Timeout</Label>
                  <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
                </div>
                <Switch defaultChecked data-testid="switch-session-timeout" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
