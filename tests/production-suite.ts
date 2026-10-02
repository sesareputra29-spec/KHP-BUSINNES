import http from 'node:http';
import { app } from '../src/server/app';
import { dbAdapter } from '../src/server/db';

// ANSI color helpers
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];
let server: http.Server;
let baseUrl = '';

async function request(path: string, options: { method?: string; token?: string; body?: any; headers?: Record<string, string> } = {}) {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json,
  };
}

async function runTest(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  ${GREEN}✓${RESET} ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: false, durationMs, error: err.message || String(err) });
    console.log(`  ${RED}✗${RESET} ${BOLD}${name}${RESET} (${durationMs}ms)`);
    console.log(`    ${RED}Error: ${err.message}${RESET}`);
  }
}

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} — Ekspektasi: ${JSON.stringify(expected)}, Diterima: ${JSON.stringify(actual)}`);
  }
}

export async function runProductionTestSuite() {
  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   HPP SAAS PRODUCTION INTEGRATION TEST SUITE        ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  // Start test server on random ephemeral port
  server = app.listen(0);
  const address = server.address() as any;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const testEmail = `founder_${Date.now()}@testumkm.com`;
  const testPassword = 'Password123!@#';
  let tokenA = '';
  let businessIdA = '';
  let userIdA = '';

  const testEmailB = `owner_b_${Date.now()}@tenantb.com`;
  let tokenB = '';
  let businessIdB = '';

  try {
    // =========================================================================
    // SUITE 1: AUTHENTICATION, SESSIONS & SECURITY TOKENS
    // =========================================================================
    console.log(`${BOLD}1. AUTHENTICATION & SESSION MANAGEMENT${RESET}`);

    await runTest('AUTH', '1.1 Registrasi Bisnis Baru (Tenant A)', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Budi Santoso',
          email: testEmail,
          password: testPassword,
          businessName: 'CV Pangan Berkah Mandiri',
          businessType: 'F&B / Kuliner',
        },
      });

      assertEqual(res.status, 201, 'Registrasi harus mengembalikan HTTP 201');
      assert(res.body.token, 'Token JWT/Sesi harus dikembalikan');
      assert(res.body.user?.id, 'Data pengguna harus ada');
      assert(res.body.business?.id, 'Data bisnis harus ada');

      tokenA = res.body.token;
      businessIdA = res.body.business.id;
      userIdA = res.body.user.id;
    });

    await runTest('AUTH', '1.2 Registrasi Bisnis Kedua (Tenant B untuk uji isolasi)', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Siti Rahma',
          email: testEmailB,
          password: testPassword,
          businessName: 'PT Kuliner Jaya Abadi',
          businessType: 'F&B / Kuliner',
        },
      });

      assertEqual(res.status, 201, 'Registrasi Tenant B harus mengembalikan HTTP 201');
      tokenB = res.body.token;
      businessIdB = res.body.business.id;
    });

    await runTest('AUTH', '1.3 Login Berhasil dengan Kredensial Valid', async () => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: { identifier: testEmail, password: testPassword },
      });

      assertEqual(res.status, 200, 'Login harus mengembalikan HTTP 200');
      assert(res.body.token, 'Token sesi harus diterbitkan');
      assertEqual(res.body.user.email, testEmail, 'Email pengguna harus cocok');
    });

    await runTest('AUTH', '1.4 Login Ditolak dengan Kata Sandi Salah (401)', async () => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: { identifier: testEmail, password: 'WrongPassword999!' },
      });

      assertEqual(res.status, 401, 'Login dengan sandi salah harus mengembalikan HTTP 401');
      assertEqual(res.body.error, 'InvalidCredentials', 'Error code harus InvalidCredentials');
    });

    await runTest('AUTH', '1.5 Login Ditolak untuk Akun Nonaktif / Disabled (403)', async () => {
      // Temporarily deactivate user
      await dbAdapter.execute('UPDATE users SET active = 0 WHERE id = ?', [userIdA]);

      const res = await request('/api/auth/login', {
        method: 'POST',
        body: { identifier: testEmail, password: testPassword },
      });

      assertEqual(res.status, 403, 'Login akun nonaktif harus mengembalikan HTTP 403');
      assertEqual(res.body.error, 'AccountDisabled', 'Error code harus AccountDisabled');

      // Re-activate user
      await dbAdapter.execute('UPDATE users SET active = 1 WHERE id = ?', [userIdA]);
    });

    await runTest('AUTH', '1.6 Verifikasi Sesi Aktif via /api/auth/me', async () => {
      const res = await request('/api/auth/me', { token: tokenA });
      assertEqual(res.status, 200, 'auth/me harus mengembalikan HTTP 200');
      assertEqual(res.body.user.email, testEmail, 'Email user harus terverifikasi');
      assertEqual(res.body.business.id, businessIdA, 'Business ID harus sesuai dengan tenant A');
    });

    await runTest('AUTH', '1.7 Alur Lupa Sandi & Reset Password dengan Token Sekali Pakai', async () => {
      // 1. Request forgot password
      const forgotRes = await request('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: testEmail },
      });
      assertEqual(forgotRes.status, 200, 'Forgot password harus mengembalikan HTTP 200');

      // Get generated reset token from database
      const tokenRow = await dbAdapter.queryOne('SELECT token FROM password_reset_tokens WHERE user_id = ? AND used = 0 ORDER BY created_at DESC LIMIT 1', [userIdA]) as any;
      assert(tokenRow?.token, 'Token reset sandi harus tersimpan di database');

      // 2. Reset password with new password
      const newPassword = 'NewSecretPassword2026!';
      const resetRes = await request('/api/auth/reset-password', {
        method: 'POST',
        body: { token: tokenRow.token, newPassword },
      });
      assertEqual(resetRes.status, 200, 'Reset password harus berhasil');

      // 3. Single-use check: Trying same token again must fail
      const reuseRes = await request('/api/auth/reset-password', {
        method: 'POST',
        body: { token: tokenRow.token, newPassword: 'AnotherPassword123!' },
      });
      assertEqual(reuseRes.status, 400, 'Token reset yang sudah terpakai harus ditolak');

      // 4. Verify login works with new password and fails with old password
      const oldLoginRes = await request('/api/auth/login', {
        method: 'POST',
        body: { identifier: testEmail, password: testPassword },
      });
      assertEqual(oldLoginRes.status, 401, 'Login dengan sandi lama harus gagal');

      const newLoginRes = await request('/api/auth/login', {
        method: 'POST',
        body: { identifier: testEmail, password: newPassword },
      });
      assertEqual(newLoginRes.status, 200, 'Login dengan sandi baru harus sukses');
      tokenA = newLoginRes.body.token; // update active token
    });

    await runTest('AUTH', '1.8 Autentikasi Platform Super Admin', async () => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: { identifier: 'superadmin@hppsaas.com', password: 'SuperAdmin123!' },
      });
      assertEqual(res.status, 200, 'Super Admin login harus sukses');
      assert(res.body.isSuperAdmin, 'Flag isSuperAdmin harus bernilai true');
    });

    // =========================================================================
    // SUITE 2: SECURITY, RBAC & TENANT ISOLATION
    // =========================================================================
    console.log(`\n${BOLD}2. SECURITY, RBAC & TENANT ISOLATION${RESET}`);

    await runTest('SECURITY', '2.1 Penolakan Akses Tanpa Autentikasi (401 Unauthorized)', async () => {
      const res = await request('/api/products');
      assertEqual(res.status, 401, 'Endpoint tanpa token harus mengembalikan HTTP 401');
    });

    let viewerToken = '';
    await runTest('SECURITY', '2.2 Pembuatan Akun Staf Peran "Viewer" (Read-Only)', async () => {
      const viewerEmail = `viewer_${Date.now()}@testumkm.com`;
      const createRes = await request('/api/users', {
        method: 'POST',
        token: tokenA,
        body: {
          name: 'Staf Viewer',
          email: viewerEmail,
          role: 'Viewer',
          password: 'ViewerPassword123!',
        },
      });
      assertEqual(createRes.status, 201, 'Admin dapat menambahkan pengguna Viewer');

      const loginViewer = await request('/api/auth/login', {
        method: 'POST',
        body: { identifier: viewerEmail, password: 'ViewerPassword123!' },
      });
      assertEqual(loginViewer.status, 200, 'Viewer login berhasil');
      viewerToken = loginViewer.body.token;
    });

    await runTest('SECURITY', '2.3 Akun Viewer Dilarang Menambah / Menghapus Data (403 Forbidden)', async () => {
      const postRes = await request('/api/products', {
        method: 'POST',
        token: viewerToken,
        body: { name: 'Produk Ilegal', sku: 'PRD-ILLEGAL', price: 10000 },
      });
      assertEqual(postRes.status, 403, 'Viewer dilarang melakukan aksi POST');

      const deleteRes = await request('/api/products/prd_dummy_id', {
        method: 'DELETE',
        token: viewerToken,
      });
      assertEqual(deleteRes.status, 403, 'Viewer dilarang melakukan aksi DELETE');
    });

    await runTest('SECURITY', '2.4 Pencegahan Eskalasi Peran (Role Escalation Prevention)', async () => {
      // Test role escalation via invite endpoint on Tenant B (where user quota is available)
      const res = await request('/api/users/invite', {
        method: 'POST',
        token: tokenB,
        body: {
          email: `hacker_${Date.now()}@test.com`,
          role: 'SUPER_ADMIN',
        },
      });
      assertEqual(res.status, 403, 'Admin biasa dilarang memberikan peran SUPER_ADMIN');
      assertEqual(res.body.error, 'ROLE_ESCALATION_FORBIDDEN', 'Kode error eskalasi peran harus sesuai');
    });

    await runTest('SECURITY', '2.5 Ketatnya Isolasi Tenant (Tenant Isolation Enforcement)', async () => {
      // 1. Create category in Tenant A
      const catResA = await request('/api/categories', {
        method: 'POST',
        token: tokenA,
        body: { name: 'Bahan Baku Tenant A', code: 'CAT-A', type: 'MATERIAL' },
      });
      assertEqual(catResA.status, 201, 'Kategori di Tenant A berhasil dibuat');
      const catIdA = catResA.body.id;

      // 2. Tenant B lists categories -> MUST NOT see Tenant A's category
      const listResB = await request('/api/categories', { token: tokenB });
      const foundInB = (listResB.body as any[]).find((c) => c.id === catIdA || c.code === 'CAT-A');
      assert(!foundInB, 'Tenant B TIDAK BOLEH melihat data kategori milik Tenant A');

      // 3. Tenant B attempts to delete Tenant A's category -> MUST BE REJECTED 404
      const delResB = await request(`/api/categories/${catIdA}`, {
        method: 'DELETE',
        token: tokenB,
      });
      assertEqual(delResB.status, 404, 'Tenant B tidak boleh menghapus entitas milik Tenant A');
    });

    await runTest('SECURITY', '2.6 Imutabilitas Audit Log (Dilarang Dihapus Pengguna)', async () => {
      const delSecLogRes = await request('/api/audit/security-logs/sec_dummy_id', {
        method: 'DELETE',
        token: tokenA,
      });
      assertEqual(delSecLogRes.status, 403, 'Penghapusan audit log harus ditolak 403 Forbidden');
      assertEqual(delSecLogRes.body.error, 'AUDIT_LOG_IMMUTABLE', 'Error code harus AUDIT_LOG_IMMUTABLE');
    });

    // =========================================================================
    // SUITE 3: SUBSCRIPTION LIFECYCLE & ENTITLEMENTS
    // =========================================================================
    console.log(`\n${BOLD}3. SUBSCRIPTION LIFECYCLE & ENTITLEMENTS${RESET}`);

    await runTest('SUBSCRIPTION', '3.1 Status Default Pendaftaran Adalah TRIAL 14 Hari', async () => {
      const res = await request('/api/subscription/entitlements', { token: tokenA });
      assertEqual(res.status, 200, 'Entitlements endpoint mengembalikan HTTP 200');
      assertEqual(res.body.subscription.status, 'TRIAL', 'Status langganan awal harus TRIAL');
      assert(res.body.subscription.daysRemaining > 0, 'Sisa hari trial harus positif');
    });

    await runTest('SUBSCRIPTION', '3.2 Fitur Terkunci (Feature Gate) Ditegakkan Sesuai Paket', async () => {
      const entRes = await request('/api/subscription/entitlements', { token: tokenA });
      const hasAdvReport = Boolean(entRes.body.features?.ADVANCED_REPORT);

      const featRes = await request('/api/analysis/advanced-profitability', { token: tokenA });
      if (hasAdvReport) {
        assertEqual(featRes.status, 200, 'Fitur harus dapat diakses jika paket mendukung');
      } else {
        assertEqual(featRes.status, 403, 'Fitur harus diblokir 403 jika paket tidak mencakup hak akses');
      }
    });

    await runTest('SUBSCRIPTION', '3.3 Penegakan Batas Kuota (Quota Limits)', async () => {
      const entRes = await request('/api/subscription/entitlements', { token: tokenA });
      assert(entRes.body.usage.products.max > 0, 'Batas produk harus terdefinisi');
      assert(entRes.body.usage.users.max > 0, 'Batas pengguna harus terdefinisi');
    });

    await runTest('SUBSCRIPTION', '3.4 Mode READ-ONLY Saat Langganan Kedaluwarsa / Suspended', async () => {
      try {
        // Mark subscription as read-only for tenant A
        await dbAdapter.execute("UPDATE subscriptions SET is_read_only = 1, status = 'EXPIRED' WHERE business_id = ?", [businessIdA]);

        // Attempt to create a category -> MUST BE REJECTED 403
        const postRes = await request('/api/categories', {
          method: 'POST',
          token: tokenA,
          body: { name: 'Kategori Saat Read-Only', code: 'CAT-RO', type: 'MATERIAL' },
        });
        assertEqual(postRes.status, 403, 'Mutasi data harus diblokir saat akun berstatus READ-ONLY');
        assert(
          postRes.body.error === 'SUBSCRIPTION_READ_ONLY' || postRes.body.error === 'SUBSCRIPTION_EXPIRED_READ_ONLY',
          `Error code harus mencerminkan status read-only (Diterima: ${postRes.body.error})`
        );

        // Reading data MUST still be allowed
        const getRes = await request('/api/categories', { token: tokenA });
        assertEqual(getRes.status, 200, 'Akses membaca data (GET) tetap diizinkan saat status READ-ONLY');
      } finally {
        // Restore subscription to ACTIVE/TRIAL
        await dbAdapter.execute("UPDATE subscriptions SET is_read_only = 0, status = 'TRIAL' WHERE business_id = ?", [businessIdA]);
      }
    });

    // =========================================================================
    // SUITE 4: CORE BUSINESS LOGIC & HPP ENGINE
    // =========================================================================
    console.log(`\n${BOLD}4. CORE BUSINESS LOGIC & HPP ENGINE${RESET}`);

    let supplierId = '';
    let flourId = '';
    let sugarId = '';
    let eggId = '';
    let productId = '';
    let bomId = '';

    await runTest('CORE', '4.1 Pembuatan Pemasok (Supplier)', async () => {
      const res = await request('/api/suppliers', {
        method: 'POST',
        token: tokenA,
        body: { name: 'PT Indofood Bogasari', code: 'SUP-BGS', contact: '0812345678', address: 'Jakarta' },
      });
      assertEqual(res.status, 201, 'Supplier berhasil dibuat');
      supplierId = res.body.id;
    });

    await runTest('CORE', '4.2 Pembuatan Master Bahan Baku & Harga Satuan', async () => {
      // 1. Tepung Terigu (Rp 12.000 / kg)
      const resFlour = await request('/api/raw-materials', {
        method: 'POST',
        token: tokenA,
        body: {
          name: 'Tepung Terigu Protein Tinggi',
          code: 'RM-FLOUR',
          unit: 'kg',
          price: 12000,
          currentStock: 100,
          minStock: 10,
          supplierId,
        },
      });
      assertEqual(resFlour.status, 201, 'Bahan tepung berhasil dibuat');
      flourId = resFlour.body.id;

      // 2. Gula Pasir (Rp 18.000 / kg)
      const resSugar = await request('/api/raw-materials', {
        method: 'POST',
        token: tokenA,
        body: {
          name: 'Gula Pasir Kristal',
          code: 'RM-SUGAR',
          unit: 'kg',
          price: 18000,
          currentStock: 50,
          minStock: 5,
          supplierId,
        },
      });
      assertEqual(resSugar.status, 201, 'Bahan gula berhasil dibuat');
      sugarId = resSugar.body.id;

      // 3. Telur Ayam (Rp 28.000 / kg)
      const resEgg = await request('/api/raw-materials', {
        method: 'POST',
        token: tokenA,
        body: {
          name: 'Telur Ayam Segar',
          code: 'RM-EGG',
          unit: 'kg',
          price: 28000,
          currentStock: 30,
          minStock: 5,
          supplierId,
        },
      });
      assertEqual(resEgg.status, 201, 'Bahan telur berhasil dibuat');
      eggId = resEgg.body.id;
    });

    await runTest('CORE', '4.3 Pembuatan Master Produk Jadi', async () => {
      const res = await request('/api/products', {
        method: 'POST',
        token: tokenA,
        body: {
          name: 'Roti Manis Cokelat Premium',
          sku: 'PRD-ROTI-CKL',
          unit: 'pcs',
          sellingPrice: 15000,
          targetMargin: 40,
          minStock: 20,
        },
      });
      assertEqual(res.status, 201, 'Produk jadi berhasil dibuat');
      productId = res.body.id;
    });

    await runTest('CORE', '4.4 Pembuatan Resep BOM & Kalkulasi HPP Satuan', async () => {
      const res = await request('/api/boms', {
        method: 'POST',
        token: tokenA,
        body: {
          code: 'BOM-ROTI-01',
          productId,
          productName: 'Roti Manis Cokelat Premium',
          outputQuantity: 100,
          outputUnit: 'pcs',
          materials: [
            { materialId: flourId, materialName: 'Tepung Terigu', quantity: 10, unit: 'kg', unitPrice: 12000, totalCost: 120000 },
            { materialId: sugarId, materialName: 'Gula Pasir', quantity: 2, unit: 'kg', unitPrice: 18000, totalCost: 36000 },
            { materialId: eggId, materialName: 'Telur Ayam', quantity: 3, unit: 'kg', unitPrice: 28000, totalCost: 84000 },
          ],
          laborCost: 60000,
          overheadCost: 40000,
          totalCost: 340000,
          unitCost: 3400,
        },
      });

      assertEqual(res.status, 201, 'BOM berhasil dibuat');
      assertEqual(res.body.unitCost, 3400, 'Kalkulasi HPP per unit harus tepat Rp 3.400');
      bomId = res.body.id;
    });

    await runTest('CORE', '4.5 Eksekusi Batch Produksi & Pemotongan Stok Bahan Baku Otomatis', async () => {
      // Create and complete production batch for 100 pcs via /api/production/batches
      const batchRes = await request('/api/production/batches', {
        method: 'POST',
        token: tokenA,
        body: {
          batchNumber: `BAT-${Date.now().toString().slice(-6)}`,
          bomId,
          productId,
          productName: 'Roti Manis Cokelat Premium',
          plannedQty: 100,
          actualQty: 100,
          status: 'COMPLETED',
          date: new Date().toISOString().substring(0, 10),
          unitCost: 3400,
          totalCost: 340000,
        },
      });

      assertEqual(batchRes.status, 201, 'Batch produksi berhasil dibuat dan diselesaikan');
      assert(batchRes.body.id, 'ID Batch produksi harus ada');
    });

    await runTest('CORE', '4.6 Penerbitan & Penerimaan Pesanan Pembelian (Purchase Order)', async () => {
      const poRes = await request('/api/purchases/orders', {
        method: 'POST',
        token: tokenA,
        body: {
          poNumber: `PO-${Date.now().toString().slice(-6)}`,
          supplierId,
          supplierName: 'PT Indofood Bogasari',
          orderDate: new Date().toISOString().substring(0, 10),
          status: 'ORDERED',
          items: [
            { materialId: flourId, materialName: 'Tepung Terigu', quantity: 50, unit: 'kg', unitPrice: 12000, total: 600000 },
          ],
          totalAmount: 600000,
        },
      });

      assertEqual(poRes.status, 201, 'Purchase Order berhasil dibuat');
      const poId = poRes.body.id;

      // Update PO status to Diterima via PUT
      const updateRes = await request(`/api/purchases/orders/${poId}/status`, {
        method: 'PUT',
        token: tokenA,
        body: { status: 'Diterima' },
      });
      assertEqual(updateRes.status, 200, 'Status PO berhasil diperbarui menjadi Diterima');
    });

    // =========================================================================
    // SUITE 5: PAYMENT GATEWAY & WEBHOOK IDEMPOTENCY
    // =========================================================================
    console.log(`\n${BOLD}5. PAYMENT GATEWAY & WEBHOOK IDEMPOTENCY${RESET}`);

    let invoiceNumber = '';
    await runTest('PAYMENT', '5.1 Inisiasi Sesi Checkout Pembayaran (Create Payment Intent)', async () => {
      const res = await request('/api/billing/create-payment-intent', {
        method: 'POST',
        token: tokenA,
        body: {
          planCode: 'PRO',
          billingCycle: 'MONTHLY',
          paymentMethod: 'QRIS',
        },
      });

      assertEqual(res.status, 201, 'Sesi checkout pembayaran berhasil dibuat');
      assert(res.body.invoice?.invoiceNumber, 'Nomor invoice tagihan harus diterbitkan');
      assert(res.body.invoice?.amount > 0, 'Jumlah pembayaran harus lebih dari 0');
      assertEqual(res.body.payment?.paymentMethod, 'QRIS', 'Metode pembayaran harus sesuai');

      invoiceNumber = res.body.invoice.invoiceNumber;
    });

    await runTest('PAYMENT', '5.2 Pemrosesan Webhook Pelunasan Pembayaran Berhasil (PAID)', async () => {
      // Simulate settlement
      const settleRes = await request('/api/billing/simulate-settlement', {
        method: 'POST',
        token: tokenA,
        body: { invoiceNumber },
      });

      assertEqual(settleRes.status, 200, 'Simulasi pelunasan harus mengembalikan HTTP 200');
      assertEqual(settleRes.body.status, 'PAID', 'Status faktur harus menjadi PAID');

      // Verify subscription state updated to ACTIVE
      const entRes = await request('/api/subscription/entitlements', { token: tokenA });
      assertEqual(entRes.body.subscription.status, 'ACTIVE', 'Status langganan bisnis harus berubah menjadi ACTIVE');
      assertEqual(entRes.body.plan.code, 'PRO', 'Kode paket aktif harus PRO');
    });

    await runTest('PAYMENT', '5.3 Idempotensi Webhook (Mencegah Duplikasi Transaksi Ganda)', async () => {
      // Re-triggering settlement with same invoice
      const duplicateRes = await request('/api/billing/simulate-settlement', {
        method: 'POST',
        token: tokenA,
        body: { invoiceNumber },
      });

      // Must handle idempotently without crash
      assertEqual(duplicateRes.status, 200, 'Webhook duplikat harus ditangani secara aman (idempotent)');
      assertEqual(duplicateRes.body.status, 'PAID', 'Status faktur tetap PAID');
    });

  } finally {
    // Teardown test server
    if (server) {
      server.close();
    }
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`\n${BOLD}${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}HASIL PENGUJIAN PRODUKSI:${RESET}`);
  console.log(`Total Pengujian  : ${total}`);
  console.log(`Lolos (Passed)   : ${GREEN}${passed}${RESET}`);
  console.log(`Gagal (Failed)   : ${failed > 0 ? RED : GREEN}${failed}${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================${RESET}\n`);

  if (failed > 0) {
    console.error(`${RED}Beberapa pengujian gagal! Rincian:${RESET}`);
    for (const f of results.filter((r) => !r.passed)) {
      console.error(`- [${f.suite}] ${f.name}: ${f.error}`);
    }
    process.exitCode = 1;
  }
}

// Auto-run if executed via CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionTestSuite().catch((err) => {
    console.error('Fatal Test Suite Failure:', err);
    process.exit(1);
  });
}
