const { Resend } = require('resend');

class EmailService {
    constructor() {
        this.resend = process.env.RESEND_API_KEY
            ? new Resend(process.env.RESEND_API_KEY)
            : null;
        this.fromEmail = process.env.FROM_EMAIL || 'XRP Tracker <noreply@isoeagle.io>';
        this.adminEmail = 'mrulewicz66@gmail.com';
    }

    async sendWaitlistConfirmation(email) {
        if (!this.resend) {
            console.log('Email service not configured - skipping confirmation email');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: email,
                subject: "You're on the XRP Tracker Waitlist!",
                html: this.getWaitlistEmailTemplate(email)
            });

            if (error) {
                console.error('Failed to send waitlist email:', error);
                return { success: false, error: error.message };
            }

            console.log(`Waitlist confirmation sent to ${email}, id: ${data.id}`);
            return { success: true, id: data.id };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    async sendAdminSignupNotification(newEmail, totalSignups) {
        if (!this.resend) {
            console.log('Email service not configured - skipping admin notification');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: this.adminEmail,
                subject: `New Waitlist Signup (#${totalSignups})`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2 style="color: #7c3aed;">New Waitlist Signup</h2>
                        <p><strong>Email:</strong> ${newEmail}</p>
                        <p><strong>Total signups:</strong> ${totalSignups}</p>
                        <p style="color: #666; font-size: 14px;">Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
                    </div>
                `
            });

            if (error) {
                console.error('Failed to send admin notification:', error);
                return { success: false, error: error.message };
            }

            console.log(`Admin notification sent, id: ${data.id}`);
            return { success: true, id: data.id };
        } catch (error) {
            console.error('Admin notification error:', error);
            return { success: false, error: error.message };
        }
    }

    getWaitlistEmailTemplate(email) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to XRP Tracker Waitlist</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #18181b;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                                XRP Tracker
                            </h1>
                            <p style="color: #e0e7ff; margin: 10px 0 0; font-size: 16px;">
                                ETF Flows & Exchange Reserves
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="background-color: #27272a; padding: 40px 30px;">
                            <h2 style="color: #ffffff; margin: 0 0 20px; font-size: 24px;">
                                You're on the list!
                            </h2>

                            <p style="color: #a1a1aa; margin: 0 0 25px; font-size: 16px; line-height: 1.6;">
                                Thanks for joining the XRP Tracker waitlist! You'll be among the first to know when we launch premium features.
                            </p>

                            <div style="background-color: #3f3f46; border-radius: 12px; padding: 25px; margin: 25px 0;">
                                <h3 style="color: #ffffff; margin: 0 0 15px; font-size: 18px;">
                                    What's coming:
                                </h3>
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #22c55e; font-size: 16px;">&#10003;</td>
                                        <td style="padding: 8px 0 8px 12px; color: #d4d4d8; font-size: 15px;">Daily ETF flow alerts via email</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #22c55e; font-size: 16px;">&#10003;</td>
                                        <td style="padding: 8px 0 8px 12px; color: #d4d4d8; font-size: 15px;">Real-time 24h exchange reserve tracking</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #22c55e; font-size: 16px;">&#10003;</td>
                                        <td style="padding: 8px 0 8px 12px; color: #d4d4d8; font-size: 15px;">Custom notification thresholds</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #22c55e; font-size: 16px;">&#10003;</td>
                                        <td style="padding: 8px 0 8px 12px; color: #d4d4d8; font-size: 15px;">Whale movement alerts</td>
                                    </tr>
                                </table>
                            </div>

                            <p style="color: #a1a1aa; margin: 25px 0; font-size: 16px; line-height: 1.6;">
                                In the meantime, track XRP ETF flows and exchange reserves for free:
                            </p>

                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td align="center" style="padding: 10px 0;">
                                        <a href="https://isoeagle.io" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            View Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1f1f23; padding: 25px 30px; border-radius: 0 0 16px 16px; text-align: center;">
                            <p style="color: #71717a; margin: 0; font-size: 13px;">
                                You received this email because ${email} signed up for the XRP Tracker waitlist.
                            </p>
                            <p style="color: #52525b; margin: 15px 0 0; font-size: 12px;">
                                &copy; ${new Date().getFullYear()} XRP Tracker | <a href="https://isoeagle.io" style="color: #6366f1; text-decoration: none;">isoeagle.io</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();
    }
}

module.exports = new EmailService();
