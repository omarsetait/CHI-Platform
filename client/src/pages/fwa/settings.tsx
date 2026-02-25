import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SemanticEmbeddingsAdmin } from "@/components/semantic-embeddings-admin";

export default function FWASettings() {
  const { toast } = useToast();
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

  const [alertRuleDialogOpen, setAlertRuleDialogOpen] = useState(false);
  const [alertRule, setAlertRule] = useState({
    name: "",
    triggerCondition: "",
    threshold: "",
    channels: {
      email: false,
      sms: false,
      inApp: true,
    },
    active: true,
  });

  const handleCreateAlertRule = () => {
    if (!alertRule.name || !alertRule.triggerCondition) {
      toast({
        title: "Validation Error",
        description: "Please provide a rule name and trigger condition.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Alert Rule Created",
      description: `Alert rule "${alertRule.name}" has been created successfully.`,
    });

    setAlertRuleDialogOpen(false);
    setAlertRule({
      name: "",
      triggerCondition: "",
      threshold: "",
      channels: {
        email: false,
        sms: false,
        inApp: true,
      },
      active: true,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Settings</h1>
          <p className="text-muted-foreground">
            Module preferences, alerts, and operational defaults
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
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-600" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Configure alert and notification preferences
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlertRuleDialogOpen(true)}
                data-testid="button-create-alert-rule"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Alert Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Alerts</Label>
                <p className="text-xs text-muted-foreground">Receive email notifications for FWA cases</p>
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
                <p className="text-xs text-muted-foreground">Immediate alerts for high-confidence FWA detection</p>
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
                <p className="text-xs text-muted-foreground">Daily summary of FWA activity</p>
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
                <p className="text-xs text-muted-foreground">Comprehensive weekly FWA report</p>
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
              <Clock className="w-5 h-5 text-purple-600" />
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
              <Database className="w-5 h-5 text-purple-600" />
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
              <p className="text-xs text-muted-foreground">How long to retain FWA case data</p>
            </div>
            <Separator />
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Storage</span>
                <span className="text-sm text-muted-foreground">2.4 GB / 10 GB</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 w-1/4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600" />
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
                defaultValue="fwa-team@tachyhealth.com"
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
              <p className="text-xs text-muted-foreground">Additional recipients for FWA alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <SemanticEmbeddingsAdmin />

      <Dialog open={alertRuleDialogOpen} onOpenChange={setAlertRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-create-alert-rule">Create Alert Rule</DialogTitle>
            <DialogDescription>
              Configure a custom alert rule for FWA notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ruleName">Rule Name</Label>
              <Input
                id="ruleName"
                placeholder="e.g., High Value FWA Alert"
                value={alertRule.name}
                onChange={(e) => setAlertRule({ ...alertRule, name: e.target.value })}
                data-testid="input-alert-rule-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger Condition</Label>
              <Select
                value={alertRule.triggerCondition}
                onValueChange={(value) => setAlertRule({ ...alertRule, triggerCondition: value })}
              >
                <SelectTrigger data-testid="select-trigger-condition">
                  <SelectValue placeholder="Select trigger condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high_risk_score">High Risk Score</SelectItem>
                  <SelectItem value="critical_case">Critical Case</SelectItem>
                  <SelectItem value="new_fwa_detection">New FWA Detection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold</Label>
              <Input
                id="threshold"
                type="number"
                placeholder="e.g., 85"
                value={alertRule.threshold}
                onChange={(e) => setAlertRule({ ...alertRule, threshold: e.target.value })}
                data-testid="input-alert-rule-threshold"
              />
              <p className="text-xs text-muted-foreground">Score threshold for triggering the alert (0-100)</p>
            </div>
            <div className="space-y-2">
              <Label>Notification Channels</Label>
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="channel-email"
                    checked={alertRule.channels.email}
                    onCheckedChange={(checked) =>
                      setAlertRule({
                        ...alertRule,
                        channels: { ...alertRule.channels, email: !!checked },
                      })
                    }
                    data-testid="checkbox-channel-email"
                  />
                  <Label htmlFor="channel-email" className="text-sm font-normal">Email</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="channel-sms"
                    checked={alertRule.channels.sms}
                    onCheckedChange={(checked) =>
                      setAlertRule({
                        ...alertRule,
                        channels: { ...alertRule.channels, sms: !!checked },
                      })
                    }
                    data-testid="checkbox-channel-sms"
                  />
                  <Label htmlFor="channel-sms" className="text-sm font-normal">SMS</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="channel-inapp"
                    checked={alertRule.channels.inApp}
                    onCheckedChange={(checked) =>
                      setAlertRule({
                        ...alertRule,
                        channels: { ...alertRule.channels, inApp: !!checked },
                      })
                    }
                    data-testid="checkbox-channel-inapp"
                  />
                  <Label htmlFor="channel-inapp" className="text-sm font-normal">In-App</Label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Enable this alert rule</p>
              </div>
              <Switch
                checked={alertRule.active}
                onCheckedChange={(checked) => setAlertRule({ ...alertRule, active: checked })}
                data-testid="switch-alert-rule-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAlertRuleDialogOpen(false)}
              data-testid="button-alert-rule-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAlertRule}
              data-testid="button-alert-rule-create"
            >
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
