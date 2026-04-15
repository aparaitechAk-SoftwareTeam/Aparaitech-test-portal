/**
 * Email Service — Nodemailer SMTP
 * ================================
 * Uses Gmail SMTP port 465 (SSL).
 * App will NOT crash if email fails — errors are logged only.
 */

const nodemailer = require('nodemailer');

const COMPANY = {
  name:    process.env.COMPANY_NAME    || 'APARAITECH',
  email:   process.env.COMPANY_EMAIL   || 'info@aparaitechsoftware.org',
  reg:     process.env.COMPANY_REG     || '2431000320445474',
  address: process.env.COMPANY_ADDRESS || 'Baramati, Maharashtra 413102'
};

// Lazy transporter — created only when first email is sent
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

const getHeader = () => `
  <div style="background:linear-gradient(135deg,#0d47a1,#1565c0);padding:30px 40px;text-align:center;border-radius:10px 10px 0 0;">
    <h1 style="color:#fff;margin:0;font-family:'Segoe UI',Arial,sans-serif;font-size:28px;letter-spacing:2px;">${COMPANY.name}</h1>
    <p style="color:#90caf9;margin:5px 0 0;font-size:13px;">Online Test Portal</p>
  </div>`;

const getFooter = () => `
  <div style="background:#f5f5f5;padding:20px 40px;text-align:center;border-radius:0 0 10px 10px;border-top:1px solid #e0e0e0;">
    <p style="margin:0;font-size:12px;color:#757575;font-family:Arial,sans-serif;">
      ${COMPANY.name} | Reg No: ${COMPANY.reg}<br>${COMPANY.address}<br>
      <a href="mailto:${COMPANY.email}" style="color:#1565c0;">${COMPANY.email}</a>
    </p>
    <p style="margin:8px 0 0;font-size:11px;color:#9e9e9e;">This is an automated email. Please do not reply.</p>
  </div>`;

// ── SEND OTP EMAIL ────────────────────────────────────
async function sendOTPEmail(toEmail, otp, name = '') {
  const expiry = process.env.OTP_EXPIRY_MINUTES || 10;
  const greeting = name ? `Hello, <strong>${name}</strong>!` : 'Hello!';

  const html = `
    <div style="max-width:560px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">
      ${getHeader()}
      <div style="padding:40px;background:#fff;">
        <p style="font-size:16px;color:#333;margin-top:0;">${greeting}</p>
        <p style="font-size:15px;color:#555;">Use the OTP below to log in to <strong>${COMPANY.name} Test Portal</strong>:</p>
        <div style="text-align:center;margin:30px 0;">
          <div style="display:inline-block;background:linear-gradient(135deg,#0d47a1,#1565c0);border-radius:12px;padding:20px 40px;">
            <span style="font-size:42px;font-weight:bold;color:#fff;letter-spacing:10px;font-family:'Courier New',monospace;">${otp}</span>
          </div>
        </div>
        <div style="background:#fff3e0;border-left:4px solid #ff9800;padding:15px 20px;border-radius:4px;">
          <p style="margin:0;font-size:13px;color:#e65100;">⏰ <strong>Expires in ${expiry} minutes.</strong><br> Do not share this OTP with anyone.</p>
        </div>
      </div>
      ${getFooter()}
    </div>`;

  try {
    const info = await getTransporter().sendMail({
      from: `"${COMPANY.name} Test Portal" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Login OTP - ${COMPANY.name}`,
      html
    });
    console.log(` OTP email sent to ${toEmail}: ${info.messageId}`);
    return { success: true };
  } catch (err) {
    console.error(` OTP email failed for ${toEmail}:`, err.message);
    throw new Error('Failed to send OTP email. Please try again.');
  }
}

// ── SEND RESULT EMAIL ─────────────────────────────────
async function sendResultEmail(result) {
  const {
    studentEmail, studentName, testTitle, testDomain,
    score, totalMarks, percentage, isPassed,
    correctCount, incorrectCount, unattempted,
    submittedAt
  } = result;

  const statusColor  = isPassed ? '#1b5e20' : '#b71c1c';
  const statusBg     = isPassed ? '#f1f8f1' : '#fdf3f3';
  const statusBorder = isPassed ? '#a5d6a7' : '#ef9a9a';
  const statusLabel  = isPassed ? 'PASSED' : 'FAILED';
  const submittedDate = new Date(submittedAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const html = `
    <div style="max-width:620px;margin:0 auto;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f6f9;">

      ${getHeader()}

      <!-- Intro -->
      <div style="background:#ffffff;padding:36px 40px 0;">
        <p style="margin:0 0 6px;font-size:15px;color:#333;">Dear <strong>${studentName || 'Student'}</strong>,</p>
        <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
          Your assessment has been evaluated. Please find your official result summary below.
        </p>

        <!-- Test Details Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
          <thead>
            <tr style="background:#f0f4ff;">
              <th colspan="2" style="padding:10px 12px;text-align:left;color:#0d47a1;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:2px solid #c5cae9;">Assessment Details</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 12px;color:#666;width:38%;">Test Title</td>
              <td style="padding:10px 12px;color:#222;font-weight:600;">${testTitle}</td>
            </tr>
            <tr style="background:#fafafa;border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 12px;color:#666;">Domain</td>
              <td style="padding:10px 12px;color:#222;">${testDomain}</td>
            </tr>
            <tr style="border-bottom:1px solid #f0f0f0;">
              <td style="padding:10px 12px;color:#666;">Submitted On</td>
              <td style="padding:10px 12px;color:#222;">${submittedDate}</td>
            </tr>
          </tbody>
        </table>

        <!-- Score Box -->
        <div style="background:${statusBg};border:1px solid ${statusBorder};border-radius:8px;padding:28px 20px;text-align:center;margin-bottom:24px;">
          <div style="font-size:13px;color:#777;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Total Score</div>
          <div style="font-size:52px;font-weight:700;color:${statusColor};line-height:1;">${score} <span style="font-size:24px;font-weight:400;color:#999;">/ ${totalMarks}</span></div>
          <div style="font-size:20px;color:${statusColor};margin:8px 0 12px;font-weight:600;">${percentage.toFixed(1)}%</div>
          <div style="display:inline-block;padding:6px 24px;border-radius:20px;background:${statusColor};color:#fff;font-size:13px;font-weight:700;letter-spacing:1.5px;">${statusLabel}</div>
        </div>

        <!-- Stats Row -->
        <table style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:24px;">
          <tr>
            <td style="text-align:center;padding:16px 10px;background:#f1f8f1;border-radius:6px;border:1px solid #c8e6c9;">
              <div style="font-size:26px;font-weight:700;color:#2e7d32;">${correctCount}</div>
              <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Correct</div>
            </td>
            <td style="text-align:center;padding:16px 10px;background:#fdf3f3;border-radius:6px;border:1px solid #ffcdd2;">
              <div style="font-size:26px;font-weight:700;color:#c62828;">${incorrectCount}</div>
              <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Incorrect</div>
            </td>
            <td style="text-align:center;padding:16px 10px;background:#fffde7;border-radius:6px;border:1px solid #fff176;">
              <div style="font-size:26px;font-weight:700;color:#f57f17;">${unattempted}</div>
              <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Skipped</div>
            </td>
          </tr>
        </table>

        <!-- CTA -->
        <div style="background:#f0f4ff;border-radius:6px;padding:16px 20px;margin-bottom:32px;">
          <p style="margin:0;font-size:13px;color:#444;line-height:1.6;">
            Your detailed answer sheet and score breakdown are available on the portal.
            Log in to view or download your official PDF result report.
          </p>
        </div>

        <p style="font-size:13px;color:#555;margin:0 0 4px;">Regards,</p>
        <p style="font-size:14px;font-weight:600;color:#0d47a1;margin:0;">${COMPANY.name} — Assessment Team</p>
      </div>

      ${getFooter()}
    </div>`;

  try {
    const info = await getTransporter().sendMail({
      from: `"${COMPANY.name} Test Portal" <${process.env.SMTP_USER}>`,
      to: studentEmail,
      subject: `Test Result Notification: ${testTitle} — ${COMPANY.name}`,
      html
    });
    console.log(`Result email sent to ${studentEmail}: ${info.messageId}`);
    return { success: true };
  } catch (err) {
    console.error(`Result email failed for ${studentEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}


// ── SEND ANNOUNCEMENT EMAIL ───────────────────────────
async function sendAnnouncementEmail(toEmails, subject, message, adminName) {
  const html = `
    <div style="max-width:620px;margin:0 auto;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f6f9;">
      ${getHeader()}
      <div style="background:#ffffff;padding:36px 40px 0;">
        <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6;">
          Dear Student,
        </p>
        <div style="font-size:15px;color:#333;line-height:1.8;white-space:pre-line;">${message}</div>
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e0e0e0;">
          <p style="font-size:13px;color:#555;margin:0 0 4px;">Regards,</p>
          <p style="font-size:14px;font-weight:600;color:#0d47a1;margin:0;">${adminName || 'Admin'} — ${COMPANY.name}</p>
        </div>
        <div style="height:32px;"></div>
      </div>
      ${getFooter()}
    </div>`;

  const transporter = getTransporter();
  let sent = 0, failed = 0;

  // Send in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < toEmails.length; i += batchSize) {
    const batch = toEmails.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(async (email) => {
      try {
        await transporter.sendMail({
          from: `"${COMPANY.name} Test Portal" <${process.env.SMTP_USER}>`,
          to: email,
          subject: `${subject} — ${COMPANY.name}`,
          html
        });
        sent++;
      } catch (err) {
        console.error(`Announcement failed for ${email}:`, err.message);
        failed++;
      }
    }));
    // Small delay between batches
    if (i + batchSize < toEmails.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return { sent, failed, total: toEmails.length };
}

// ── SEND PAYMENT RECEIPT EMAIL ────────────────────────
async function sendReceiptEmail({ enrollment, workshop, student }) {
  const { generateReceiptPDFBuffer } = require('./pdfService');

  const receiptNo = `RCP-${enrollment.paymentId || enrollment._id.toString().slice(-8).toUpperCase()}`;
  const paidDate  = new Date(enrollment.enrolledAt || Date.now())
    .toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const amtText  = enrollment.fee > 0 ? `₹${enrollment.fee.toLocaleString('en-IN')}` : 'FREE';
  const typeText = enrollment.paymentStatus === 'free' ? 'Free Enrollment' : 'Online Payment (Razorpay)';

  const html = `
    <div style="max-width:620px;margin:0 auto;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f6f9;">
      ${getHeader()}
      <div style="background:#ffffff;padding:36px 40px 0;">
        <p style="margin:0 0 6px;font-size:15px;color:#333;">Dear <strong>${student.name || 'Student'}</strong>,</p>
        <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
          Your enrollment for <strong>${workshop.title}</strong> has been confirmed.
          Please find your payment receipt attached to this email.
        </p>

        <!-- Receipt Summary Box -->
        <div style="background:#f0f8ff;border:1px solid #b3d4f5;border-radius:8px;padding:24px;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="color:#666;padding:6px 0;">Receipt No</td><td style="font-weight:600;color:#222;">${receiptNo}</td></tr>
            <tr><td style="color:#666;padding:6px 0;">Workshop</td><td style="font-weight:600;color:#222;">${workshop.title}</td></tr>
            <tr><td style="color:#666;padding:6px 0;">Date</td><td style="color:#333;">${paidDate}</td></tr>
            <tr><td style="color:#666;padding:6px 0;">Amount Paid</td><td style="font-weight:700;font-size:16px;color:#1b5e20;">${amtText}</td></tr>
            <tr><td style="color:#666;padding:6px 0;">Payment Type</td><td style="color:#333;">${typeText}</td></tr>
            ${enrollment.paymentId ? `<tr><td style="color:#666;padding:6px 0;">Transaction ID</td><td style="font-family:monospace;color:#555;">${enrollment.paymentId}</td></tr>` : ''}
          </table>
        </div>

        <!-- Workshop Details -->
        <div style="background:#f9f9f9;border-radius:6px;padding:16px 20px;margin-bottom:24px;font-size:13px;color:#555;line-height:1.8;">
          <strong style="color:#333;">Workshop Details</strong><br>
          Dates: ${new Date(workshop.startDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}
          – ${new Date(workshop.endDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}<br>
          Venue: ${workshop.venue || 'Online / TBD'}<br>
          Instructor: ${workshop.instructor || COMPANY.name}
        </div>

        <div style="background:#e8f5e9;border-left:4px solid #43a047;padding:14px 18px;border-radius:4px;margin-bottom:28px;">
          <p style="margin:0;font-size:13px;color:#1b5e20;">
            Your receipt PDF is attached to this email. Log in to the portal to access your workshop materials.
          </p>
        </div>

        <p style="font-size:13px;color:#555;margin:0 0 4px;">Regards,</p>
        <p style="font-size:14px;font-weight:600;color:#0d47a1;margin:0 0 32px;">${COMPANY.name} — Workshop Team</p>
      </div>
      ${getFooter()}
    </div>`;

  try {
    // Generate PDF buffer
    const pdfBuffer = await generateReceiptPDFBuffer({ enrollment, workshop, student });

    const info = await getTransporter().sendMail({
      from:    `"${COMPANY.name} Test Portal" <${process.env.SMTP_USER}>`,
      to:      student.email,
      subject: `Enrollment Confirmed: ${workshop.title} — ${COMPANY.name}`,
      html,
      attachments: [{
        filename:    `receipt-${receiptNo}.pdf`,
        content:     pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
    console.log(`Receipt email sent to ${student.email}: ${info.messageId}`);
    return { success: true };
  } catch (err) {
    console.error(`Receipt email failed for ${student.email}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendResultEmail, sendAnnouncementEmail, sendReceiptEmail };
