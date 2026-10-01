interface BaseTemplateOptions {
  title: string;
  previewText: string;
  contentHtml: string;
  footerNote?: string;
}

function renderBaseLayout(opts: BaseTemplateOptions): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f6f8; color: #1e293b; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center; }
    .logo-badge { display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #ffffff; font-weight: 700; font-size: 14px; letter-spacing: 1px; padding: 4px 12px; border-radius: 6px; margin-bottom: 8px; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 600; }
    .body-content { padding: 32px 24px; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .btn:hover { background-color: #0369a1; }
    .info-box { background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 14px; color: #334155; }
    .security-notice { background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #991b1b; margin-top: 24px; }
    .footer { text-align: center; padding: 24px 16px; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo-badge">HPP SAAS PLATFORM</div>
        <h1>${opts.title}</h1>
      </div>
      <div class="body-content">
        ${opts.contentHtml}
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} HPP SaaS Enterprise. Hak Cipta Dilindungi.</p>
      <p>${opts.footerNote || 'Email ini dikirimkan secara otomatis oleh sistem kami. Mohon tidak membalas langsung ke alamat ini.'}</p>
    </div>
  </div>
</body>
</html>`;
}

// ==========================================
// 1. EMAIL VERIFICATION
// ==========================================
export interface EmailVerificationParams {
  name: string;
  verifyUrl: string;
  token: string;
}

export function renderEmailVerification(params: EmailVerificationParams): { subject: string; html: string; text: string } {
  const subject = 'Verifikasi Alamat Email Akun Anda - HPP SaaS';
  const contentHtml = `
    <p>Halo <strong>${params.name}</strong>,</p>
    <p>Terima kasih telah bergabung dengan Kalkulator HPP SaaS. Untuk mengaktifkan akun Anda dan mengamankan kepemilikan bisnis, silakan verifikasi alamat email Anda dengan menekan tombol di bawah ini:</p>
    <div style="text-align: center;">
      <a href="${params.verifyUrl}" class="btn">Verifikasi Email Saya</a>
    </div>
    <div class="info-box">
      <strong>Tautan alternatif:</strong><br>
      <span style="font-size: 12px; word-break: break-all;">${params.verifyUrl}</span>
    </div>
    <div class="security-notice">
      <strong>Catatan Keamanan:</strong> Tautan verifikasi ini berlaku selama 24 jam. Jika Anda tidak merasa mendaftar di HPP SaaS, Anda dapat mengabaikan email ini.
    </div>
  `;

  const html = renderBaseLayout({
    title: 'Verifikasi Email Anda',
    previewText: 'Selesaikan verifikasi alamat email akun HPP SaaS Anda.',
    contentHtml,
  });

  const text = `Halo ${params.name},\n\nTerima kasih telah bergabung di Kalkulator HPP SaaS. Silakan verifikasi email Anda melalui tautan berikut:\n${params.verifyUrl}\n\nTautan ini berlaku selama 24 jam.\n\nHPP SaaS Team`;

  return { subject, html, text };
}

// ==========================================
// 2. FORGOT PASSWORD
// ==========================================
export interface ForgotPasswordParams {
  name: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function renderForgotPassword(params: ForgotPasswordParams): { subject: string; html: string; text: string } {
  const subject = 'Permintaan Pemulihan Kata Sandi - HPP SaaS';
  const expires = params.expiresInMinutes || 15;
  const contentHtml = `
    <p>Halo <strong>${params.name}</strong>,</p>
    <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun HPP SaaS Anda. Silakan klik tombol di bawah untuk membuat kata sandi baru:</p>
    <div style="text-align: center;">
      <a href="${params.resetUrl}" class="btn" style="background-color: #dc2626;">Atur Ulang Kata Sandi</a>
    </div>
    <div class="info-box">
      <strong>Tautan pemulihan:</strong><br>
      <span style="font-size: 12px; word-break: break-all;">${params.resetUrl}</span>
    </div>
    <div class="security-notice">
      <strong>Perhatian Keamanan Penting:</strong>
      <ul style="margin: 6px 0 0 0; padding-left: 20px;">
        <li>Tautan ini hanya berlaku selama <strong>${expires} menit</strong> dan hanya dapat digunakan <strong>1 (satu) kali</strong>.</li>
        <li>Kami tidak pernah meminta kata sandi Anda melalui email, telepon, atau pesan singkat.</li>
        <li>Jika Anda tidak meminta pengaturan ulang kata sandi ini, abaikan email ini dan akun Anda tetap aman.</li>
      </ul>
    </div>
  `;

  const html = renderBaseLayout({
    title: 'Pemulihan Kata Sandi',
    previewText: 'Instruksi pemulihan kata sandi akun HPP SaaS Anda.',
    contentHtml,
  });

  const text = `Halo ${params.name},\n\nKami menerima permintaan reset kata sandi akun HPP SaaS Anda. Klik tautan berikut untuk membuat kata sandi baru:\n${params.resetUrl}\n\nTautan berlaku selama ${expires} menit dan sekali pakai.\n\nHPP SaaS Security Team`;

  return { subject, html, text };
}

// ==========================================
// 3. PASSWORD RESET CONFIRMATION
// ==========================================
export interface PasswordResetSuccessParams {
  name: string;
  timestamp: string;
  loginUrl: string;
}

export function renderPasswordResetSuccess(params: PasswordResetSuccessParams): { subject: string; html: string; text: string } {
  const subject = 'Kata Sandi Akun Anda Berhasil Diperbarui - HPP SaaS';
  const contentHtml = `
    <p>Halo <strong>${params.name}</strong>,</p>
    <p>Kata sandi untuk akun HPP SaaS Anda telah <strong>berhasil diperbarui</strong> pada <strong>${params.timestamp}</strong>.</p>
    <div class="info-box" style="border-left-color: #10b981;">
      <strong>Status:</strong> Kata sandi baru Anda sekarang aktif. Anda dapat langsung masuk ke dashboard bisnis Anda.
    </div>
    <div style="text-align: center;">
      <a href="${params.loginUrl}" class="btn" style="background-color: #059669;">Masuk ke Aplikasi</a>
    </div>
    <div class="security-notice">
      <strong>Bukan Anda yang melakukan perubahan ini?</strong><br>
      Jika Anda merasa tidak melakukan perubahan kata sandi, segera hubungi tim dukungan keamanan kami untuk mengamankan akun bisnis Anda.
    </div>
  `;

  const html = renderBaseLayout({
    title: 'Kata Sandi Berhasil Diperbarui',
    previewText: 'Kata sandi akun HPP SaaS Anda telah berhasil diubah.',
    contentHtml,
  });

  const text = `Halo ${params.name},\n\nKata sandi akun HPP SaaS Anda telah berhasil diubah pada ${params.timestamp}.\n\nJika bukan Anda yang melakukannya, segera hubungi dukungan kami.\n\nHPP SaaS Security Team`;

  return { subject, html, text };
}

// ==========================================
// 4. USER INVITATION
// ==========================================
export interface TeamInvitationParams {
  inviteeEmail: string;
  inviterName: string;
  businessName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}

export function renderTeamInvitation(params: TeamInvitationParams): { subject: string; html: string; text: string } {
  const subject = `Undangan Bergabung ke Tim ${params.businessName} - HPP SaaS`;
  const contentHtml = `
    <p>Halo,</p>
    <p><strong>${params.inviterName}</strong> telah mengundang Anda untuk bergabung ke dalam ruang kerja <strong>${params.businessName}</strong> di aplikasi Kalkulator HPP SaaS.</p>
    <div class="info-box">
      <strong>Rincian Peran Akun:</strong><br>
      • Bisnis: <strong>${params.businessName}</strong><br>
      • Peran Hak Akses (Role): <strong>${params.role}</strong><br>
      • Batas Waktu Undangan: <strong>${params.expiresAt}</strong>
    </div>
    <p>Silakan klik tautan di bawah ini untuk menerima undangan dan mengatur kata sandi akun Anda:</p>
    <div style="text-align: center;">
      <a href="${params.inviteUrl}" class="btn">Terima Undangan Tim</a>
    </div>
    <div class="security-notice">
      Tautan undangan ini ditujukan khusus untuk <strong>${params.inviteeEmail}</strong>. Jangan teruskan tautan ini kepada orang lain.
    </div>
  `;

  const html = renderBaseLayout({
    title: 'Undangan Kolaborasi Tim',
    previewText: `${params.inviterName} mengundang Anda bergabung di ${params.businessName}.`,
    contentHtml,
  });

  const text = `Halo,\n\n${params.inviterName} mengundang Anda bergabung ke tim ${params.businessName} dengan peran ${params.role}.\n\nTerima undangan di sini: ${params.inviteUrl}\n\nHPP SaaS Team`;

  return { subject, html, text };
}

// ==========================================
// 5. PAYMENT CONFIRMATION
// ==========================================
export interface PaymentConfirmationParams {
  customerName: string;
  invoiceNumber: string;
  planName: string;
  amountFormatted: string;
  paymentMethod: string;
  paidAt: string;
  endDate: string;
}

export function renderPaymentConfirmation(params: PaymentConfirmationParams): { subject: string; html: string; text: string } {
  const subject = `Konfirmasi Pembayaran Lunas [${params.invoiceNumber}] - HPP SaaS`;
  const contentHtml = `
    <p>Halo <strong>${params.customerName}</strong>,</p>
    <p>Pembayaran langganan Anda telah berhasil diverifikasi oleh payment gateway. Bisnis Anda kini aktif menikmati seluruh fitur paket <strong>${params.planName}</strong>.</p>
    <div class="info-box" style="border-left-color: #10b981;">
      <strong>Ringkasan Transaksi:</strong><br>
      • Nomor Faktur: <strong>${params.invoiceNumber}</strong><br>
      • Paket Langganan: <strong>${params.planName}</strong><br>
      • Total Pembayaran: <strong>${params.amountFormatted}</strong><br>
      • Metode Pembayaran: <strong>${params.paymentMethod}</strong><br>
      • Waktu Lunas: <strong>${params.paidAt}</strong><br>
      • Masa Aktif Hingga: <strong>${params.endDate}</strong>
    </div>
    <p>Seluruh batasan mode baca-saja telah dicabut. Anda dapat langsung menerbitkan SPK produksi, mengelola inventaris, dan menganalisis profitabilitas bisnis Anda tanpa hambatan.</p>
    <div style="text-align: center;">
      <a href="/dashboard" class="btn" style="background-color: #059669;">Buka Dashboard Bisnis</a>
    </div>
  `;

  const html = renderBaseLayout({
    title: 'Pembayaran Berhasil Diverifikasi',
    previewText: `Faktur ${params.invoiceNumber} telah lunas. Paket ${params.planName} aktif.`,
    contentHtml,
  });

  const text = `Halo ${params.customerName},\n\nPembayaran faktur ${params.invoiceNumber} untuk paket ${params.planName} sebesar ${params.amountFormatted} telah lunas.\nMasa aktif paket hingga ${params.endDate}.\n\nHPP SaaS Billing Team`;

  return { subject, html, text };
}

// ==========================================
// 6. INVOICE NOTIFICATION
// ==========================================
export interface InvoiceNotificationParams {
  customerName: string;
  invoiceNumber: string;
  planName: string;
  amountFormatted: string;
  dueDate: string;
  paymentUrl: string;
}

export function renderInvoiceNotification(params: InvoiceNotificationParams): { subject: string; html: string; text: string } {
  const subject = `Tagihan Baru Diterbitkan [${params.invoiceNumber}] - HPP SaaS`;
  const contentHtml = `
    <p>Halo <strong>${params.customerName}</strong>,</p>
    <p>Faktur tagihan baru telah diterbitkan untuk perpanjangan paket langganan Anda di Kalkulator HPP SaaS.</p>
    <div class="info-box">
      <strong>Rincian Tagihan:</strong><br>
      • Nomor Faktur: <strong>${params.invoiceNumber}</strong><br>
      • Paket: <strong>${params.planName}</strong><br>
      • Jumlah Pembayaran: <strong>${params.amountFormatted}</strong><br>
      • Tanggal Jatuh Tempo: <strong>${params.dueDate}</strong>
    </div>
    <p>Silakan selesaikan pembayaran sebelum tanggal jatuh tempo guna menghindari pembatasan mode baca-saja pada akun bisnis Anda.</p>
    <div style="text-align: center;">
      <a href="${params.paymentUrl}" class="btn">Bayar Tagihan Sekarang</a>
    </div>
  `;

  const html = renderBaseLayout({
    title: 'Pemberitahuan Tagihan',
    previewText: `Faktur baru ${params.invoiceNumber} sebesar ${params.amountFormatted} telah terbit.`,
    contentHtml,
  });

  const text = `Halo ${params.customerName},\n\nFaktur baru ${params.invoiceNumber} sebesar ${params.amountFormatted} untuk paket ${params.planName} telah terbit. Jatuh tempo: ${params.dueDate}.\nBayar di sini: ${params.paymentUrl}\n\nHPP SaaS Billing Team`;

  return { subject, html, text };
}

// ==========================================
// 7. SUBSCRIPTION / TRIAL REMINDER
// ==========================================
export interface SubscriptionReminderParams {
  customerName: string;
  businessName: string;
  planName: string;
  daysRemaining: number;
  expiryDate: string;
  upgradeUrl: string;
  isTrial: boolean;
}

export function renderSubscriptionReminder(params: SubscriptionReminderParams): { subject: string; html: string; text: string } {
  const typeText = params.isTrial ? 'Masa Uji Coba (Trial)' : 'Langganan Berbayar';
  const subject = `Peringatan: ${typeText} Anda Berakhir dalam ${params.daysRemaining} Hari - HPP SaaS`;
  const contentHtml = `
    <p>Halo <strong>${params.customerName}</strong>,</p>
    <p>Pemberitahuan bahwa <strong>${typeText}</strong> untuk bisnis <strong>${params.businessName}</strong> akan berakhir dalam <strong>${params.daysRemaining} hari</strong> pada <strong>${params.expiryDate}</strong>.</p>
    <div class="info-box" style="border-left-color: #f59e0b;">
      <strong>Status Saat Ini:</strong><br>
      • Bisnis: <strong>${params.businessName}</strong><br>
      • Paket: <strong>${params.planName}</strong><br>
      • Sisa Waktu: <strong>${params.daysRemaining} hari lagi</strong>
    </div>
    <p>Untuk memastikan operasional pabrik, SPK produksi, dan input persediaan tidak terganggu, silakan tingkatkan atau perpanjang paket langganan Anda sekarang.</p>
    <div style="text-align: center;">
      <a href="${params.upgradeUrl}" class="btn" style="background-color: #d97706;">Perpanjang / Upgrade Paket</a>
    </div>
    <div class="security-notice" style="background-color: #fffbeb; border-color: #fde68a; color: #92400e;">
      <strong>Data Anda Tetap Aman:</strong> Jika langganan berakhir, seluruh data formula resep, batch, dan riwayat HPP Anda dijamin tetap tersimpan rapi dan dapat diekspor kapan saja dalam mode baca-saja.
    </div>
  `;

  const html = renderBaseLayout({
    title: `Pengingat Masa Aktif ${typeText}`,
    previewText: `${typeText} Anda tersisa ${params.daysRemaining} hari lagi.`,
    contentHtml,
  });

  const text = `Halo ${params.customerName},\n\n${typeText} untuk ${params.businessName} akan berakhir dalam ${params.daysRemaining} hari pada ${params.expiryDate}.\nPerpanjang sekarang: ${params.upgradeUrl}\n\nHPP SaaS Team`;

  return { subject, html, text };
}
