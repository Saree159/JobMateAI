"""
Email notification service for JobMate AI.
Sends reminders for interviews, follow-ups, and deadlines.
"""
from typing import List
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings


class EmailNotificationService:
    """Service for sending email notifications."""
    
    def __init__(self):
        self.smtp_server = getattr(settings, 'smtp_server', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'smtp_port', 587)
        self.smtp_username = getattr(settings, 'smtp_username', None)
        self.smtp_password = getattr(settings, 'smtp_password', None)
        self.from_email = getattr(settings, 'from_email', 'noreply@jobmate.ai')
    
    def send_email(self, to_email: str, subject: str, body: str, html: str = None):
        """
        Send an email notification.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Plain text body
            html: Optional HTML body
        """
        if not self.smtp_username or not self.smtp_password:
            print(f"[Email Service] Would send email to {to_email}: {subject}")
            print(f"[Email Service] SMTP not configured. Set SMTP_USERNAME and SMTP_PASSWORD in .env")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            # Add plain text part
            text_part = MIMEText(body, 'plain')
            msg.attach(text_part)
            
            # Add HTML part if provided
            if html:
                html_part = MIMEText(html, 'html')
                msg.attach(html_part)
            
            # Connect to SMTP server and send
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            print(f"[Email Service] Successfully sent email to {to_email}: {subject}")
            return True
            
        except Exception as e:
            print(f"[Email Service] Failed to send email: {str(e)}")
            return False
    
    def send_interview_reminder(self, user_email: str, user_name: str, job_title: str, 
                                company: str, interview_date: datetime):
        """Send interview reminder email."""
        subject = f"Interview Reminder: {job_title} at {company}"
        
        body = f"""Hi {user_name},

This is a friendly reminder about your upcoming interview:

Position: {job_title}
Company: {company}
Date: {interview_date.strftime('%B %d, %Y at %I:%M %p')}

Good luck with your interview!

Best regards,
JobMate AI Team
"""
        
        html = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2 style="color: #4F46E5;">Interview Reminder</h2>
    <p>Hi {user_name},</p>
    <p>This is a friendly reminder about your upcoming interview:</p>
    <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Position:</strong> {job_title}</p>
        <p style="margin: 5px 0;"><strong>Company:</strong> {company}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> {interview_date.strftime('%B %d, %Y at %I:%M %p')}</p>
    </div>
    <p>Good luck with your interview! 🎉</p>
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Best regards,<br>
        JobMate AI Team
    </p>
</body>
</html>
"""
        
        return self.send_email(user_email, subject, body, html)
    
    def send_follow_up_reminder(self, user_email: str, user_name: str, job_title: str, 
                                company: str, days_since_applied: int):
        """Send follow-up reminder for application."""
        subject = f"Time to Follow Up: {job_title} at {company}"
        
        body = f"""Hi {user_name},

It's been {days_since_applied} days since you applied to {company} for the {job_title} position.

This is a good time to follow up on your application. Here are some tips:

1. Send a brief, polite email to the hiring manager
2. Reiterate your interest in the position
3. Mention any relevant updates to your qualifications
4. Keep it concise and professional

Good luck!

Best regards,
JobMate AI Team
"""
        
        html = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2 style="color: #4F46E5;">Follow-Up Reminder</h2>
    <p>Hi {user_name},</p>
    <p>It's been <strong>{days_since_applied} days</strong> since you applied to {company} for the {job_title} position.</p>
    <p>This is a good time to follow up on your application. Here are some tips:</p>
    <ul>
        <li>Send a brief, polite email to the hiring manager</li>
        <li>Reiterate your interest in the position</li>
        <li>Mention any relevant updates to your qualifications</li>
        <li>Keep it concise and professional</li>
    </ul>
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Best regards,<br>
        JobMate AI Team
    </p>
</body>
</html>
"""
        
        return self.send_email(user_email, subject, body, html)
    
    def send_deadline_reminder(self, user_email: str, user_name: str, job_title: str, 
                              company: str, deadline_date: datetime):
        """Send application deadline reminder."""
        subject = f"Application Deadline Approaching: {job_title} at {company}"
        
        body = f"""Hi {user_name},

The application deadline for {job_title} at {company} is approaching:

Deadline: {deadline_date.strftime('%B %d, %Y')}

Make sure to submit your application before the deadline!

Best regards,
JobMate AI Team
"""
        
        html = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2 style="color: #DC2626;">Application Deadline Approaching</h2>
    <p>Hi {user_name},</p>
    <p>The application deadline for <strong>{job_title}</strong> at <strong>{company}</strong> is approaching:</p>
    <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
        <p style="margin: 5px 0;"><strong>Deadline:</strong> {deadline_date.strftime('%B %d, %Y')}</p>
    </div>
    <p>Make sure to submit your application before the deadline! ⏰</p>
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Best regards,<br>
        JobMate AI Team
    </p>
</body>
</html>
"""
        
        return self.send_email(user_email, subject, body, html)
    
    def send_job_alert(self, user_email: str, user_name: str, keywords: str, 
                       matches_found: int, alert_url: str):
        """Send job alert notification when matching jobs are found."""
        subject = f"🎯 {matches_found} New Job{'s' if matches_found > 1 else ''} Matching Your Alert"
        
        body = f"""Hi {user_name},

Great news! We found {matches_found} new job{'s' if matches_found > 1 else ''} matching your alert criteria:

Keywords: {keywords}

View matching jobs: {alert_url}

Don't miss out on these opportunities!

Best regards,
JobMate AI Team
"""
        
        html = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2 style="color: #10B981;">🎯 New Job Alert!</h2>
    <p>Hi {user_name},</p>
    <p>Great news! We found <strong>{matches_found} new job{'s' if matches_found > 1 else ''}</strong> matching your alert criteria:</p>
    <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
        <p style="margin: 5px 0;"><strong>Keywords:</strong> {keywords}</p>
        <p style="margin: 5px 0;"><strong>Matches Found:</strong> {matches_found}</p>
    </div>
    <p>
        <a href="{alert_url}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">
            View Matching Jobs
        </a>
    </p>
    <p>Don't miss out on these opportunities! 🚀</p>
    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        Best regards,<br>
        JobMate AI Team
    </p>
</body>
</html>
"""
        
        return self.send_email(user_email, subject, body, html)


# Singleton instance
email_service = EmailNotificationService()
