import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(
      configService.getOrThrow<string>('RESEND_API_KEY'),
    );
    this.from = configService.get<string>(
      'RESEND_FROM_EMAIL',
      'Emplorer <noreply@emplorer.com>',
    );
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Welcome to Emplorer',
      html: `<p>Hi ${firstName},</p>
<p>Welcome to Emplorer! We're glad you joined.</p>
<p>Start exploring companies and share your workplace experience.</p>
<p>— The Emplorer Team</p>`,
    });
  }

  async sendPasswordResetOtpEmail(
    email: string,
    firstName: string,
    otp: string,
    ttlMinutes: number,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your Emplorer password reset code',
      html: `<p>Hi ${firstName},</p>
<p>Use the code below to reset your password. It expires in ${ttlMinutes} minutes.</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p>
<p>If you did not request this, you can safely ignore this email.</p>
<p>— The Emplorer Team</p>`,
    });
  }

  async sendPasswordResetConfirmationEmail(
    email: string,
    firstName: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your Emplorer password has been reset',
      html: `<p>Hi ${firstName},</p>
<p>Your password was successfully reset. You can now log in with your new password.</p>
<p>If you did not make this change, please contact our support team immediately.</p>
<p>— The Emplorer Team</p>`,
    });
  }

  async sendPasswordChangedEmail(
    email: string,
    firstName: string,
  ): Promise<void> {
    const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
    await this.send({
      to: email,
      subject: 'Your Emplorer password was changed',
      html: `<p>${greeting}</p>
<p>Your account password was just updated.</p>
<p>If you did not make this change, please contact our support team immediately.</p>
<p>— The Emplorer Team</p>`,
    });
  }

  async sendAccountDeletedEmail(
    email: string,
    firstName: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: 'Your Emplorer account has been deleted',
      html: `<p>Hi ${firstName},</p>
<p>Your Emplorer account and associated data have been permanently deleted.</p>
<p>We're sorry to see you go. If this was a mistake, you're always welcome to create a new account.</p>
<p>— The Emplorer Team</p>`,
    });
  }

  async sendCompanySubmittedEmail(
    email: string,
    firstName: string,
    companyName: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: `Your company "${companyName}" has been submitted`,
      html: `<p>Hi ${firstName},</p>
<p>Your submission for <strong>${companyName}</strong> is now under review.</p>
<p>Once approved, the company profile will be visible to the public and open for reviews.</p>
<p>— The Emplorer Team</p>`,
    });
  }

  async sendReviewPublishedEmail(
    email: string,
    firstName: string,
    companyName: string,
  ): Promise<void> {
    const companyPart = companyName
      ? ` for <strong>${companyName}</strong>`
      : '';
    await this.send({
      to: email,
      subject: 'Your review is now live on Emplorer',
      html: `<p>Hi ${firstName},</p>
<p>Your review${companyPart} has been published and is now visible to the community.</p>
<p>Thank you for sharing your experience!</p>
<p>— The Emplorer Team</p>`,
    });
  }

  async sendNewCritiqueEmail(
    email: string,
    firstName: string,
    critiqueTitle: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: 'Someone critiqued your review on Emplorer',
      html: `<p>Hi ${firstName},</p>
<p>A new critique titled <strong>"${critiqueTitle}"</strong> has been posted on one of your reviews.</p>
<p>Log in to Emplorer to read and respond.</p>
<p>— The Emplorer Team</p>`,
    });
  }

  async sendNewCommentEmail(email: string, firstName: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Someone commented on your review on Emplorer',
      html: `<p>Hi ${firstName},</p>
<p>A new comment has been posted on one of your reviews.</p>
<p>Log in to Emplorer to read and reply.</p>
<p>— The Emplorer Team</p>`,
    });
  }

  private async send(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      this.logger.error(
        `Failed to send email to ${params.to}: ${error.message}`,
      );
    }
  }
}
