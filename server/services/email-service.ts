import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface CircularEmailOptions {
  circularNumber: string;
  title: string;
  type: string;
  effectiveDate: string;
  summary: string;
  content?: string;
  recipients: EmailRecipient[];
}

export async function sendCircularNotification(options: CircularEmailOptions): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
}> {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const results = {
    success: true,
    sentCount: 0,
    failedCount: 0,
    errors: [] as string[]
  };

  const typeLabels: Record<string, string> = {
    policy_update: 'Policy Update',
    compliance_bulletin: 'Compliance Bulletin',
    enforcement_notice: 'Enforcement Notice',
    guidance: 'Guidance',
    alert: 'Alert'
  };

  const typeLabel = typeLabels[options.type] || options.type;

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #1a5f3c; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; opacity: 0.9; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-top: 12px; }
    .badge-policy { background-color: #3b82f6; color: white; }
    .badge-compliance { background-color: #10b981; color: white; }
    .badge-enforcement { background-color: #ef4444; color: white; }
    .badge-guidance { background-color: #f59e0b; color: white; }
    .badge-alert { background-color: #8b5cf6; color: white; }
    .content { padding: 24px; }
    .meta { background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
    .meta-item { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .meta-label { color: #6b7280; font-size: 14px; }
    .meta-value { font-weight: 600; color: #111827; }
    .summary { padding: 16px; border-right: 4px solid #1a5f3c; background-color: #f0fdf4; margin-bottom: 20px; }
    .content-section { margin-bottom: 24px; }
    .content-section h3 { color: #1a5f3c; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .content-section p { line-height: 1.7; color: #374151; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
    .footer a { color: #1a5f3c; text-decoration: none; }
    .action-required { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 20px; }
    .action-required h4 { color: #92400e; margin: 0 0 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>مجلس الضمان الصحي</h1>
      <p>Council of Health Insurance (CHI)</p>
      <span class="badge badge-${options.type.replace('_', '-')}">${typeLabel}</span>
    </div>
    
    <div class="content">
      <div class="meta">
        <div class="meta-item">
          <span class="meta-label">Circular Number / رقم التعميم:</span>
          <span class="meta-value">${options.circularNumber}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Effective Date / تاريخ السريان:</span>
          <span class="meta-value">${options.effectiveDate}</span>
        </div>
      </div>

      <h2 style="color: #111827; margin-bottom: 16px;">${options.title}</h2>
      
      <div class="summary">
        <p style="margin: 0; color: #166534;">${options.summary}</p>
      </div>

      ${options.content ? `
      <div class="content-section">
        <h3>Circular Content / محتوى التعميم</h3>
        <p>${options.content}</p>
      </div>
      ` : ''}

      <div class="action-required">
        <h4>⚠️ Action Required / إجراء مطلوب</h4>
        <p style="margin: 0; color: #92400e;">
          Please acknowledge receipt of this circular through the CHI Provider Portal within 5 business days.
          <br/>
          يرجى تأكيد استلام هذا التعميم من خلال بوابة مقدمي الخدمة خلال 5 أيام عمل.
        </p>
      </div>
    </div>

    <div class="footer">
      <p>This is an official communication from the Council of Health Insurance (CHI)</p>
      <p>هذا تعميم رسمي من مجلس الضمان الصحي</p>
      <p style="margin-top: 12px;">
        <a href="#">View in Portal</a> | 
        <a href="#">Acknowledge Receipt</a> | 
        <a href="#">Contact CHI</a>
      </p>
      <p style="margin-top: 16px; font-size: 11px; color: #9ca3af;">
        © 2025 Council of Health Insurance. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  for (const recipient of options.recipients) {
    try {
      await client.emails.send({
        from: fromEmail || 'CHI Regulatory <noreply@chi.gov.sa>',
        to: [recipient.email],
        subject: `[CHI ${options.circularNumber}] ${options.title}`,
        html: htmlContent,
      });
      results.sentCount++;
    } catch (error: any) {
      results.failedCount++;
      results.errors.push(`Failed to send to ${recipient.email}: ${error.message}`);
    }
  }

  results.success = results.failedCount === 0;
  return results;
}

export async function sendTestEmail(toEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    await client.emails.send({
      from: fromEmail || 'CHI Regulatory <noreply@chi.gov.sa>',
      to: [toEmail],
      subject: 'CHI Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Email Configuration Test Successful</h2>
          <p>This is a test email from the CHI FWA Detection Platform.</p>
          <p>If you received this email, your email integration is working correctly.</p>
          <hr/>
          <p style="color: #666; font-size: 12px;">Council of Health Insurance - مجلس الضمان الصحي</p>
        </div>
      `,
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
