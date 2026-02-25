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
  Bell,
  Clock,
  Mail,
  Database,
  Save,
  FileText,
  DollarSign,
} from "lucide-react";

export default function ProviderRelationsSettings() {
  const [notifications, setNotifications] = useState({
    contractRenewals: true,
    settlementAlerts: true,
    discrepancyAlerts: true,
    weeklyReport: true,
  });

  const [processing, setProcessing] = useState({
    autoReconciliation: true,
    settlementFrequency: "quarterly",
    retentionDays: "365",
    currency: "SAR",
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Provider Relations Settings</h1>
          <p className="text-muted-foreground">
            Configure settings for provider management and reconciliation
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
                <Label>Contract Renewals</Label>
                <p className="text-xs text-muted-foreground">Get notified 90 days before contract expiration</p>
              </div>
              <Switch
                checked={notifications.contractRenewals}
                onCheckedChange={(checked) => setNotifications({ ...notifications, contractRenewals: checked })}
                data-testid="switch-contract-renewals"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Settlement Alerts</Label>
                <p className="text-xs text-muted-foreground">Notifications for pending settlements</p>
              </div>
              <Switch
                checked={notifications.settlementAlerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, settlementAlerts: checked })}
                data-testid="switch-settlement-alerts"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Discrepancy Alerts</Label>
                <p className="text-xs text-muted-foreground">Alert when reconciliation discrepancies exceed threshold</p>
              </div>
              <Switch
                checked={notifications.discrepancyAlerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, discrepancyAlerts: checked })}
                data-testid="switch-discrepancy-alerts"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Weekly Report</Label>
                <p className="text-xs text-muted-foreground">Weekly summary of provider activities</p>
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
              Configure reconciliation and settlement settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Reconciliation</Label>
                <p className="text-xs text-muted-foreground">Automatically reconcile claims at end of period</p>
              </div>
              <Switch
                checked={processing.autoReconciliation}
                onCheckedChange={(checked) => setProcessing({ ...processing, autoReconciliation: checked })}
                data-testid="switch-auto-reconciliation"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Settlement Frequency</Label>
              <Select
                value={processing.settlementFrequency}
                onValueChange={(value) => setProcessing({ ...processing, settlementFrequency: value })}
              >
                <SelectTrigger data-testid="select-settlement-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How often to generate settlement reports</p>
            </div>
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select
                value={processing.currency}
                onValueChange={(value) => setProcessing({ ...processing, currency: value })}
              >
                <SelectTrigger data-testid="select-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
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
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="730">2 years</SelectItem>
                  <SelectItem value="1825">5 years</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How long to retain provider data and reports</p>
            </div>
            <Separator />
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Storage</span>
                <span className="text-sm text-muted-foreground">4.2 GB / 20 GB</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary w-1/5" />
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
                defaultValue="provider-team@tachyhealth.com"
                data-testid="input-primary-email"
              />
            </div>
            <div className="space-y-2">
              <Label>CC Recipients</Label>
              <Input
                type="email"
                placeholder="Comma-separated emails"
                defaultValue="finance@tachyhealth.com, operations@tachyhealth.com"
                data-testid="input-cc-emails"
              />
              <p className="text-xs text-muted-foreground">Additional recipients for settlement and discrepancy alerts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Settlement Thresholds
            </CardTitle>
            <CardDescription>
              Configure thresholds for automated alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Discrepancy Alert Threshold</Label>
              <Input
                type="number"
                placeholder="10000"
                defaultValue="10000"
                data-testid="input-discrepancy-threshold"
              />
              <p className="text-xs text-muted-foreground">Alert when discrepancy exceeds this amount (SAR)</p>
            </div>
            <div className="space-y-2">
              <Label>CPM Variance Alert (%)</Label>
              <Input
                type="number"
                placeholder="10"
                defaultValue="10"
                data-testid="input-cpm-variance"
              />
              <p className="text-xs text-muted-foreground">Alert when CPM variance exceeds this percentage</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Report Settings
            </CardTitle>
            <CardDescription>
              Configure default report generation settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Report Format</Label>
              <Select defaultValue="pdf">
                <SelectTrigger data-testid="select-report-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Include Charts</Label>
              <Select defaultValue="yes">
                <SelectTrigger data-testid="select-include-charts">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Include visual charts in generated reports</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
