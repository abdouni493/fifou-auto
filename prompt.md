# Claude Code Prompt — Connect Showroom App to Supabase

Copy and paste this entire prompt into Claude Code.

---

## MISSION

You are integrating a React + Vite showroom management application (currently talking to a Node/Express backend via `/api/*`) with a **Supabase** backend.

**Supabase Project:**
- URL: `https://ewwdiycrlsbzgruyfzio.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3d2RpeWNybHNiemdydXlmemlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjQ0NDQsImV4cCI6MjA5NzQ0MDQ0NH0.oEHV6oSmOt8H0WoJ6m8nKwlgie4E-lQkuyid4plEMGo`

The SQL schema has already been applied to the Supabase project. Your job is to rewrite the frontend to use Supabase directly (no backend server needed).

---

## STEP 1 — Install Supabase client

```bash
cd frontend
npm install @supabase/supabase-js
```

---

## STEP 2 — Create Supabase client file

Create `frontend/src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://ewwdiycrlsbzgruyfzio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3d2RpeWNybHNiemdydXlmemlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjQ0NDQsImV4cCI6MjA5NzQ0MDQ0NH0.oEHV6oSmOt8H0WoJ6m8nKwlgie4E-lQkuyid4plEMGo'
);

// Helper: get public URL for any bucket object
export function getPublicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Helper: upload a file and return its public URL
export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return getPublicUrl(bucket, data.path);
}
```

---

## STEP 3 — Replace `frontend/src/lib/api.js`

Replace the entire file with a Supabase-based API layer. Keep the same exported interface so existing components work with minimal changes:

```js
import { supabase, uploadFile } from './supabase.js';

// ── AUTH ──────────────────────────────────────────────────────
export const auth = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },
  async register({ fullName, username, email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Insert profile row
    await supabase.from('users').insert({
      auth_id: data.user.id,
      full_name: fullName,
      username,
      email,
    });
    return data.user;
  },
  async logout() {
    await supabase.auth.signOut();
  },
  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
  },
};

// ── SETTINGS ─────────────────────────────────────────────────
export const settingsApi = {
  async get() {
    const { data } = await supabase.from('settings').select('*').single();
    return data;
  },
  async update(payload) {
    const { data } = await supabase.from('settings').update(payload).eq('id', 1).select().single();
    return data;
  },
  // Upload logo to showroom-logo bucket, return public URL
  async uploadLogo(file) {
    const ext = file.name.split('.').pop();
    return uploadFile('showroom-logo', `logo.${ext}`, file);
  },
};

// ── CARS ─────────────────────────────────────────────────────
export const carsApi = {
  async list({ status = '', search = '' } = {}) {
    let q = supabase.from('cars').select(`
      *,
      car_documents(*),
      expenses(*),
      purchases(*, supplier:suppliers(*), client:clients(*), purchase_payments(*)),
      sales(*, client:clients(*), sale_payments(*))
    `).order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (search) q = q.or(`brand.ilike.%${search}%,model.ilike.%${search}%,plate.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },
  async get(id) {
    const { data, error } = await supabase.from('cars').select(`
      *,
      car_documents(*),
      expenses(*),
      purchases(*, supplier:suppliers(*), client:clients(*), purchase_payments(*)),
      sales(*, client:clients(*), sale_payments(*))
    `).eq('id', id).single();
    if (error) throw error;
    return data;
  },
  async create(payload) {
    const { data, error } = await supabase.from('cars').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('cars').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const { error } = await supabase.from('cars').delete().eq('id', id);
    if (error) throw error;
  },
  // Upload car images to car-images bucket, return array of public URLs
  async uploadImages(carId, files) {
    const urls = [];
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${carId}/${crypto.randomUUID()}.${ext}`;
      const url = await uploadFile('car-images', path, file);
      urls.push(url);
    }
    return urls;
  },
  // Upload car document (image or PDF) to car-documents bucket
  async uploadDocument(carId, file) {
    const ext = file.name.split('.').pop();
    const path = `${carId}/${crypto.randomUUID()}.${ext}`;
    return uploadFile('car-documents', path, file);
  },
  async getDocumentTypes() {
    const { data } = await supabase.from('car_document_types').select('*').order('name');
    return data || [];
  },
  async createDocumentType(name) {
    const { data } = await supabase.from('car_document_types').insert({ name }).select().single();
    return data;
  },
};

// ── PURCHASES ─────────────────────────────────────────────────
export const purchasesApi = {
  async list({ sourceType = '', paid = '', search = '' } = {}) {
    let q = supabase.from('purchases').select(`
      *,
      car:cars(*, car_documents(*)),
      supplier:suppliers(*),
      client:clients(*),
      purchase_payments(*)
    `).order('created_at', { ascending: false });
    if (sourceType) q = q.eq('source_type', sourceType);
    if (search) q = q.or(`car.brand.ilike.%${search}%,car.model.ilike.%${search}%,car.plate.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    // Filter paid status client-side
    if (paid === 'PAID') return data.filter(p => p.amount_rest <= 0);
    if (paid === 'DEBT') return data.filter(p => p.amount_rest > 0);
    return data;
  },
  async create({ sourceType, supplierId, clientId, car, purchasePrice, sellingPrice, amountPaid, inspection, date, documents = [] }) {
    // 1. Create the car row (without images/docs yet — they are already uploaded URLs)
    const { data: carRow, error: carError } = await supabase.from('cars').insert({
      brand: car.brand,
      model: car.model,
      plate: car.plate,
      year: car.year,
      color: car.color,
      energy: car.energy,
      gearbox: car.gearbox,
      seats: car.seats,
      mileage: car.mileage,
      vin: car.vin,
      keys_count: car.keysCount,
      fiche: car.fiche,
      images: car.images || [],    // array of public URLs already uploaded
      inspection,
    }).select().single();
    if (carError) throw carError;

    // 2. Insert car documents (each doc has { type, url } — url is already uploaded)
    if (documents.length > 0) {
      await supabase.from('car_documents').insert(
        documents.map(d => ({ car_id: carRow.id, type: d.type, doc_url: d.url }))
      );
    }

    // 3. Create the purchase
    const { data: purchase, error: purError } = await supabase.from('purchases').insert({
      car_id: carRow.id,
      source_type: sourceType,
      supplier_id: supplierId || null,
      client_id: clientId || null,
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      amount_paid: amountPaid,
      date,
    }).select().single();
    if (purError) throw purError;

    return purchase;
  },
  async delete(id) {
    // Also deletes the car (cascade)
    const { data: purchase } = await supabase.from('purchases').select('car_id').eq('id', id).single();
    await supabase.from('purchases').delete().eq('id', id);
    if (purchase?.car_id) await supabase.from('cars').delete().eq('id', purchase.car_id);
  },
  async addPayment(purchaseId, amount) {
    await supabase.from('purchase_payments').insert({ purchase_id: purchaseId, amount, date: new Date().toISOString() });
  },
};

// ── SALES ─────────────────────────────────────────────────────
export const salesApi = {
  async list({ saleType = '', paid = '', search = '' } = {}) {
    let q = supabase.from('sales').select(`
      *,
      car:cars(*),
      client:clients(*),
      sale_payments(*)
    `).order('created_at', { ascending: false });
    if (saleType) q = q.eq('sale_type', saleType);
    const { data, error } = await q;
    if (error) throw error;
    let result = data || [];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.client?.first_name?.toLowerCase().includes(s) ||
        r.client?.last_name?.toLowerCase().includes(s) ||
        r.client?.phone_primary?.includes(s) ||
        r.reference?.includes(s)
      );
    }
    if (paid === 'PAID') return result.filter(r => r.amount_rest <= 0);
    if (paid === 'DEBT') return result.filter(r => r.amount_rest > 0);
    return result;
  },
  async create(payload) {
    // Calculate totals
    const base = Number(payload.basePrice) || 0;
    const afterTax = payload.tvaEnabled ? base * (1 + (Number(payload.tvaRate) || 0) / 100) : base;
    let total = afterTax;
    if (payload.reductionType === 'PERCENT') total = afterTax * (1 - (Number(payload.reductionValue) || 0) / 100);
    else if (payload.reductionType === 'FIXED') total = Math.max(0, afterTax - (Number(payload.reductionValue) || 0));
    total = Math.round(total);

    // Create client if new
    let clientId = payload.clientId;
    if (!clientId && payload.client) {
      const { data: cl } = await supabase.from('clients').insert({
        first_name: payload.client.firstName,
        last_name: payload.client.lastName,
        phone_primary: payload.client.phonePrimary,
        phone_secondary: payload.client.phoneSecondary,
        email: payload.client.email,
        address: payload.client.address,
        photo_url: payload.client.photo,
        doc_type: payload.client.docType,
        doc_number: payload.client.docNumber,
      }).select().single();
      clientId = cl?.id;
    }

    const { data, error } = await supabase.from('sales').insert({
      car_id: payload.carId,
      client_id: clientId,
      sale_type: payload.saleType,
      total_before_tax: base,
      tva_enabled: payload.tvaEnabled,
      tva_rate: payload.tvaRate,
      reduction_type: payload.reductionType,
      reduction_value: payload.reductionValue,
      total_after_reduction: total,
      amount_paid: payload.amountPaid,
      client_take_car: payload.clientTakeCar,
      inspection: payload.inspection,
      date: payload.date,
    }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('sales').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    await supabase.from('sales').delete().eq('id', id);
  },
  async addPayment(saleId, carId, amount, description) {
    await supabase.from('sale_payments').insert({ sale_id: saleId, car_id: carId, amount, description, date: new Date().toISOString() });
  },
};

// ── CLIENTS ───────────────────────────────────────────────────
export const clientsApi = {
  async list() {
    const { data, error } = await supabase.from('clients').select('*, purchases(*), sales(*)').order('created_at', { ascending: false });
    if (error) throw error;
    // Attach computed stats
    return (data || []).map(c => ({
      ...c,
      stats: {
        totalPurchases: c.purchases?.length || 0,
        totalSales: c.sales?.length || 0,
        saleRest: (c.sales || []).reduce((a, s) => a + (s.amount_rest || 0), 0),
      },
    }));
  },
  async create(payload) {
    const { data, error } = await supabase.from('clients').insert({
      first_name: payload.firstName,
      last_name: payload.lastName,
      phone_primary: payload.phonePrimary,
      phone_secondary: payload.phoneSecondary,
      email: payload.email,
      address: payload.address,
      profession: payload.profession,
      birth_date: payload.birthDate || null,
      birth_place: payload.birthPlace,
      gender: payload.gender || null,
      doc_type: payload.docType,
      doc_number: payload.docNumber,
      doc_delivery_date: payload.docDeliveryDate || null,
      doc_expiry: payload.docExpiry || null,
      doc_delivery_address: payload.docDeliveryAddress,
      nif: payload.nif,
      rc: payload.rc,
      photo_url: payload.photo,
    }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('clients').update({
      first_name: payload.firstName,
      last_name: payload.lastName,
      phone_primary: payload.phonePrimary,
      phone_secondary: payload.phoneSecondary,
      email: payload.email,
      address: payload.address,
      profession: payload.profession,
      birth_date: payload.birthDate || null,
      birth_place: payload.birthPlace,
      gender: payload.gender || null,
      doc_type: payload.docType,
      doc_number: payload.docNumber,
      photo_url: payload.photo,
    }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    await supabase.from('clients').delete().eq('id', id);
  },
  async history(id) {
    const { data: sales } = await supabase.from('sales').select('*, car:cars(*), sale_payments(*)').eq('client_id', id);
    const { data: purchases } = await supabase.from('purchases').select('*, car:cars(*)').eq('client_id', id);
    const totalSaleAmount = (sales || []).reduce((a, s) => a + s.total_after_reduction, 0);
    const totalPurchaseAmount = (purchases || []).reduce((a, p) => a + p.purchase_price, 0);
    const totalPaid = (sales || []).reduce((a, s) => a + s.amount_paid, 0);
    const totalRest = (sales || []).reduce((a, s) => a + s.amount_rest, 0);
    return { sales: sales || [], purchases: purchases || [], stats: { totalSaleAmount, totalPurchaseAmount, totalPaid, totalRest } };
  },
  // Upload client photo to client-photos bucket
  async uploadPhoto(clientId, file) {
    const ext = file.name.split('.').pop();
    const path = `${clientId || 'new'}/${crypto.randomUUID()}.${ext}`;
    return uploadFile('client-photos', path, file);
  },
};

// ── SUPPLIERS ─────────────────────────────────────────────────
export const suppliersApi = {
  async list() {
    const { data } = await supabase.from('suppliers').select('*').order('full_name');
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('suppliers').insert({
      full_name: payload.fullName,
      phone: payload.phone,
      address: payload.address,
      nif: payload.nif,
      nis: payload.nis,
      article: payload.article,
      rs: payload.rs,
    }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('suppliers').update({
      full_name: payload.fullName,
      phone: payload.phone,
      address: payload.address,
      nif: payload.nif,
      nis: payload.nis,
      article: payload.article,
      rs: payload.rs,
    }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    await supabase.from('suppliers').delete().eq('id', id);
  },
  async purchases(id) {
    const { data } = await supabase.from('purchases').select('*, car:cars(*)').eq('supplier_id', id);
    return data || [];
  },
};

// ── WORKERS ───────────────────────────────────────────────────
export const workersApi = {
  async list() {
    const { data } = await supabase.from('workers').select('*, role:worker_roles(*), advances:worker_advances(*), absences:worker_absences(*), payments:worker_payments(*)').order('created_at', { ascending: false });
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('workers').insert({
      full_name: payload.fullName,
      phone: payload.phone,
      birthday: payload.birthday || null,
      id_card_number: payload.idCardNumber,
      role_id: payload.roleId || null,
      payment_type: payload.paymentType,
      payment_amount: payload.paymentAmount || 0,
      start_date: payload.startDate || null,
      account_enabled: payload.accountEnabled,
      email: payload.email,
      username: payload.username,
    }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('workers').update({
      full_name: payload.fullName,
      phone: payload.phone,
      birthday: payload.birthday || null,
      id_card_number: payload.idCardNumber,
      role_id: payload.roleId || null,
      payment_type: payload.paymentType,
      payment_amount: payload.paymentAmount || 0,
      start_date: payload.startDate || null,
      account_enabled: payload.accountEnabled,
    }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    await supabase.from('workers').delete().eq('id', id);
  },
  async updatePermissions(workerId, permissions) {
    // permissions live on the role; update the role's permissions JSON
    const { data: worker } = await supabase.from('workers').select('role_id').eq('id', workerId).single();
    if (worker?.role_id) {
      await supabase.from('worker_roles').update({ permissions }).eq('id', worker.role_id);
    }
  },
  async addAdvance(workerId, payload) {
    await supabase.from('worker_advances').insert({ worker_id: workerId, amount: payload.amount, date: payload.date, description: payload.description });
  },
  async addAbsence(workerId, payload) {
    await supabase.from('worker_absences').insert({ worker_id: workerId, cost: payload.cost, date: payload.date, description: payload.description });
  },
  async addPayment(workerId, payload) {
    await supabase.from('worker_payments').insert({ worker_id: workerId, amount: payload.amount, date: payload.date, description: payload.description, month: payload.month });
  },
  async listRoles() {
    const { data } = await supabase.from('worker_roles').select('*').order('name');
    return data || [];
  },
  async createRole(name) {
    const { data, error } = await supabase.from('worker_roles').insert({ name, permissions: {} }).select().single();
    if (error) throw error;
    return data;
  },
};

// ── EXPENSES ─────────────────────────────────────────────────
export const expensesApi = {
  async list(type = '') {
    let q = supabase.from('expenses').select('*, car:cars(brand,model,plate,images)').order('date', { ascending: false });
    if (type) q = q.eq('type', type);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async create(payload) {
    const { data, error } = await supabase.from('expenses').insert({
      name: payload.name,
      description: payload.description,
      amount: payload.amount,
      type: payload.type,
      car_id: payload.carId || null,
      date: payload.date,
    }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('expenses').update({
      name: payload.name,
      description: payload.description,
      amount: payload.amount,
      date: payload.date,
    }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    await supabase.from('expenses').delete().eq('id', id);
  },
};

// ── PAYMENTS (Règlements page) ────────────────────────────────
export const paymentsApi = {
  async list(search = '') {
    const { data, error } = await supabase.from('sale_payments').select(`
      *,
      car:cars(brand, model, plate, images),
      sale:sales(client:clients(first_name, last_name, phone_primary, photo_url))
    `).order('date', { ascending: false });
    if (error) throw error;
    let result = data || [];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r =>
        r.car?.brand?.toLowerCase().includes(s) ||
        r.car?.model?.toLowerCase().includes(s) ||
        r.sale?.client?.first_name?.toLowerCase().includes(s) ||
        r.sale?.client?.last_name?.toLowerCase().includes(s)
      );
    }
    return result;
  },
  async create({ carId, amount, description, date }) {
    // Find the open sale for this car
    const { data: sale } = await supabase.from('sales').select('id').eq('car_id', carId).order('created_at', { ascending: false }).limit(1).single();
    if (!sale) throw new Error('Aucune vente trouvée pour ce véhicule');
    const { data, error } = await supabase.from('sale_payments').insert({
      sale_id: sale.id,
      car_id: carId,
      amount,
      description,
      date,
    }).select().single();
    if (error) throw error;
    return data;
  },
  async update(id, payload) {
    const { data, error } = await supabase.from('sale_payments').update({ amount: payload.amount, description: payload.description }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async delete(id) {
    await supabase.from('sale_payments').delete().eq('id', id);
  },
};

// ── DASHBOARD ─────────────────────────────────────────────────
export const dashboardApi = {
  async stats() {
    const [cars, sales, purchases, expenses, reservations] = await Promise.all([
      supabase.from('cars').select('id, status, created_at'),
      supabase.from('sales').select('*, car:cars(brand,model,plate,images,status)'),
      supabase.from('purchases').select('amount_rest'),
      supabase.from('expenses').select('amount, date'),
      supabase.from('website_reservations').select('id').eq('status', 'PENDING'),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const carsData = cars.data || [];
    const salesData = sales.data || [];
    const purchasesData = purchases.data || [];
    const expensesData = expenses.data || [];

    const kpis = {
      carsInStock: carsData.filter(c => c.status === 'AVAILABLE').length,
      carsSoldMonth: carsData.filter(c => c.status === 'SOLD' && c.created_at >= monthStart).length,
      carsReserved: carsData.filter(c => c.status === 'RESERVED').length,
      caMonth: salesData.filter(s => s.date >= monthStart).reduce((a, s) => a + s.total_after_reduction, 0),
      clientDebts: salesData.reduce((a, s) => a + (s.amount_rest > 0 ? s.amount_rest : 0), 0),
      supplierDebts: purchasesData.reduce((a, p) => a + (p.amount_rest > 0 ? p.amount_rest : 0), 0),
      expensesMonth: expensesData.filter(e => e.date >= monthStart.slice(0, 10)).reduce((a, e) => a + e.amount, 0),
      netProfit: salesData.reduce((a, s) => a + s.total_after_reduction, 0) - expensesData.reduce((a, e) => a + e.amount, 0),
    };

    // Monthly chart data (last 6 months)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return { label: d.toLocaleString('fr', { month: 'short' }), month: d.toISOString().slice(0, 7) };
    }).map(m => ({
      ...m,
      revenue: salesData.filter(s => s.date?.slice(0, 7) === m.month).reduce((a, s) => a + s.total_after_reduction, 0),
      expenses: expensesData.filter(e => e.date?.slice(0, 7) === m.month).reduce((a, e) => a + e.amount, 0),
    }));

    const statusDistribution = {
      AVAILABLE: carsData.filter(c => c.status === 'AVAILABLE').length,
      SOLD: carsData.filter(c => c.status === 'SOLD').length,
      RESERVED: carsData.filter(c => c.status === 'RESERVED').length,
    };

    const lists = {
      recentSales: salesData.slice(0, 5),
      debtSales: salesData.filter(s => s.amount_rest > 0).slice(0, 5),
    };

    const website = { pendingReservations: (reservations.data || []).length };

    return { kpis, charts: { months, statusDistribution }, lists, website };
  },
};

// ── WEBSITE ───────────────────────────────────────────────────
export const websiteApi = {
  async offers() {
    // Cars that are AVAILABLE and not hidden, with selling price from purchase
    const { data } = await supabase.from('cars').select(`
      *, purchases(selling_price)
    `).eq('status', 'AVAILABLE').eq('hidden', false).order('created_at', { ascending: false });
    return (data || []).map(c => ({
      ...c,
      price: c.purchases?.[0]?.selling_price || 0,
    }));
  },
  async adminOffers() {
    const { data } = await supabase.from('cars').select('*, purchases(selling_price)').eq('status', 'AVAILABLE').order('created_at', { ascending: false });
    return (data || []).map(c => ({ ...c, price: c.purchases?.[0]?.selling_price || 0 }));
  },
  async specialOffers() {
    const { data } = await supabase.from('special_offers').select('*, car:cars(*, purchases(selling_price))').order('created_at', { ascending: false });
    return (data || []).map(o => ({
      ...o,
      oldPrice: o.car?.purchases?.[0]?.selling_price,
    }));
  },
  async createSpecialOffer(payload) {
    const { data, error } = await supabase.from('special_offers').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async deleteSpecialOffer(id) {
    await supabase.from('special_offers').delete().eq('id', id);
  },
  async setVisibility(carId, hidden) {
    await supabase.from('cars').update({ hidden }).eq('id', carId);
  },
  async reservations() {
    const { data } = await supabase.from('website_reservations').select('*, car:cars(brand,model,plate,images)').order('created_at', { ascending: false });
    return data || [];
  },
  async createReservation({ carId, clientName, clientPhone }) {
    await supabase.from('website_reservations').insert({ car_id: carId, client_name: clientName, client_phone: clientPhone });
  },
  async updateReservationStatus(id, status) {
    await supabase.from('website_reservations').update({ status }).eq('id', id);
  },
};

// ── REPORTS ───────────────────────────────────────────────────
export const reportsApi = {
  async generate({ startDate, endDate }) {
    const [sales, purchases, expenses] = await Promise.all([
      supabase.from('sales').select('*, car:cars(brand,model,plate), client:clients(first_name,last_name)').gte('date', startDate).lte('date', endDate),
      supabase.from('purchases').select('*, car:cars(brand,model,plate), supplier:suppliers(full_name)').gte('date', startDate).lte('date', endDate),
      supabase.from('expenses').select('*').gte('date', startDate.slice(0, 10)).lte('date', endDate.slice(0, 10)),
    ]);
    return {
      sales: sales.data || [],
      purchases: purchases.data || [],
      expenses: expenses.data || [],
      totals: {
        revenue: (sales.data || []).reduce((a, s) => a + s.total_after_reduction, 0),
        costs: (purchases.data || []).reduce((a, p) => a + p.purchase_price, 0),
        expenses: (expenses.data || []).reduce((a, e) => a + e.amount, 0),
      },
    };
  },
};

export default { auth, settingsApi, carsApi, purchasesApi, salesApi, clientsApi, suppliersApi, workersApi, expensesApi, paymentsApi, dashboardApi, websiteApi, reportsApi };
```

---

## STEP 4 — Update `frontend/src/store/useStore.js`

Replace the entire file to use Supabase auth:

```js
import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';
import { settingsApi } from '../lib/api.js';

export const useStore = create((set, get) => ({
  user: null,
  settings: null,
  language: localStorage.getItem('lang') || 'fr',
  authChecked: false,

  setLanguage: (lang) => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    set({ language: lang });
  },

  async loadMe() {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    set({ user, authChecked: true });
    if (user) get().loadSettings();
    return user;
  },

  async loadSettings() {
    try {
      const data = await settingsApi.get();
      set({ settings: data });
    } catch {}
  },

  setUser: (user) => set({ user }),
  setSettings: (settings) => set({ settings }),

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ user: data.user });
    get().loadSettings();
    return data.user;
  },

  async register(payload) {
    const { auth: authApi } = await import('../lib/api.js');
    const user = await authApi.register(payload);
    set({ user });
    get().loadSettings();
    return user;
  },

  async logout() {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
```

---

## STEP 5 — Update image upload helper

Update `frontend/src/hooks/useApi.js` — replace the `uploadImages` function:

```js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { refetch(); }, deps);

  return { data, loading, error, refetch, setData };
}

// Upload images to Supabase Storage (car-images bucket), return public URLs
export async function uploadImages(files) {
  const urls = [];
  for (const file of files) {
    const ext = file.name.split('.').pop();
    const path = `temp/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from('car-images').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('car-images').getPublicUrl(data.path);
    urls.push(publicUrl);
  }
  return urls;
}
```

---

## STEP 6 — Update all pages to use the new API module

Go through each page file and replace `api.get(...)`, `api.post(...)`, etc. with calls to the named API modules imported from `'../lib/api.js'`. Here is the mapping:

| Old call | New call |
|---|---|
| `api.get('/cars')` | `carsApi.list()` |
| `api.get('/purchases')` | `purchasesApi.list()` |
| `api.post('/purchases', payload)` | `purchasesApi.create(payload)` |
| `api.delete('/purchases/:id')` | `purchasesApi.delete(id)` |
| `api.post('/purchases/:id/payments', {amount})` | `purchasesApi.addPayment(id, amount)` |
| `api.get('/sales')` | `salesApi.list()` |
| `api.post('/sales', payload)` | `salesApi.create(payload)` |
| `api.put('/sales/:id', payload)` | `salesApi.update(id, payload)` |
| `api.delete('/sales/:id')` | `salesApi.delete(id)` |
| `api.post('/sales/:id/payments', {amount})` | `salesApi.addPayment(saleId, carId, amount, desc)` |
| `api.get('/clients')` | `clientsApi.list()` |
| `api.post('/clients', payload)` | `clientsApi.create(payload)` |
| `api.put('/clients/:id', payload)` | `clientsApi.update(id, payload)` |
| `api.delete('/clients/:id')` | `clientsApi.delete(id)` |
| `api.get('/clients/:id/history')` | `clientsApi.history(id)` |
| `api.get('/suppliers')` | `suppliersApi.list()` |
| `api.post('/suppliers', payload)` | `suppliersApi.create(payload)` |
| `api.put('/suppliers/:id', payload)` | `suppliersApi.update(id, payload)` |
| `api.delete('/suppliers/:id')` | `suppliersApi.delete(id)` |
| `api.get('/suppliers/:id/purchases')` | `suppliersApi.purchases(id)` |
| `api.get('/workers')` | `workersApi.list()` |
| `api.post('/workers', payload)` | `workersApi.create(payload)` |
| `api.put('/workers/:id', payload)` | `workersApi.update(id, payload)` |
| `api.delete('/workers/:id')` | `workersApi.delete(id)` |
| `api.get('/workers/roles')` | `workersApi.listRoles()` |
| `api.post('/workers/roles', {name})` | `workersApi.createRole(name)` |
| `api.put('/workers/:id/permissions', {permissions})` | `workersApi.updatePermissions(id, permissions)` |
| `api.post('/workers/:id/advances', payload)` | `workersApi.addAdvance(id, payload)` |
| `api.post('/workers/:id/absences', payload)` | `workersApi.addAbsence(id, payload)` |
| `api.post('/workers/:id/payments', payload)` | `workersApi.addPayment(id, payload)` |
| `api.get('/expenses')` | `expensesApi.list(type)` |
| `api.post('/expenses', payload)` | `expensesApi.create(payload)` |
| `api.put('/expenses/:id', payload)` | `expensesApi.update(id, payload)` |
| `api.delete('/expenses/:id')` | `expensesApi.delete(id)` |
| `api.get('/payments')` | `paymentsApi.list(search)` |
| `api.post('/payments', payload)` | `paymentsApi.create(payload)` |
| `api.put('/payments/:id', payload)` | `paymentsApi.update(id, payload)` |
| `api.delete('/payments/:id')` | `paymentsApi.delete(id)` |
| `api.get('/dashboard/stats')` | `dashboardApi.stats()` |
| `api.get('/settings')` | `settingsApi.get()` |
| `api.put('/settings', payload)` | `settingsApi.update(payload)` |
| `api.get('/website/offers')` | `websiteApi.offers()` |
| `api.get('/website/admin/offers')` | `websiteApi.adminOffers()` |
| `api.get('/website/admin/special-offers')` | `websiteApi.specialOffers()` |
| `api.post('/website/special-offers', payload)` | `websiteApi.createSpecialOffer(payload)` |
| `api.delete('/website/special-offers/:id')` | `websiteApi.deleteSpecialOffer(id)` |
| `api.put('/website/offers/:id/visibility', {hidden})` | `websiteApi.setVisibility(id, hidden)` |
| `api.get('/website/reservations')` | `websiteApi.reservations()` |
| `api.post('/website/reservations', payload)` | `websiteApi.createReservation(payload)` |
| `api.patch('/website/reservations/:id/status', {status})` | `websiteApi.updateReservationStatus(id, status)` |
| `api.get('/cars/document-types')` | `carsApi.getDocumentTypes()` |
| `api.post('/cars/document-types', {name})` | `carsApi.createDocumentType(name)` |
| `uploadImages([file])` in document scan | `carsApi.uploadDocument(carId, file)` |

---

## STEP 7 — Image display

All image URLs stored in Supabase are already **full public URLs** (e.g., `https://ewwdiycrlsbzgruyfzio.supabase.co/storage/v1/object/public/car-images/...`).

The existing `<CarImage>` component and `<img src={url}>` tags work as-is since URLs are absolute. No changes needed for image display.

For the `imageUrl()` helper in `api.js`, it is no longer needed (URLs are always absolute). You can remove it or keep it as a passthrough:

```js
export function imageUrl(path) {
  return path || null;
}
```

---

## STEP 8 — Settings: logo field name

In `Settings.jsx`, change `form.logo` / `form.logo_url` references to use `logo_url` (the Supabase column name):

```js
// Old: <SingleImageUpload value={form.logo} onChange={(url) => setForm({ ...form, logo: url })} />
// New:
<SingleImageUpload value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} />
```

And in the store/settings usage:
```js
// Old: settings?.logo
// New: settings?.logo_url
```

Update all references to `settings.logo` → `settings.logo_url` across:
- `Login.jsx`
- `AppShell.jsx` / `Sidebar.jsx`
- `WebsiteSettings.jsx` (Appearance tab)
- `PrintTemplates.jsx`
- `WebsiteNav.jsx`

---

## STEP 9 — Data shape mapping

Supabase returns `snake_case` column names. The existing components use `camelCase` (e.g., `firstName`, `phonePrimary`). You have two options:

**Option A (Recommended): Add a mapper function in each API call**

```js
function mapClient(c) {
  return {
    ...c,
    firstName: c.first_name,
    lastName: c.last_name,
    phonePrimary: c.phone_primary,
    phoneSecondary: c.phone_secondary,
    birthDate: c.birth_date,
    birthPlace: c.birth_place,
    docType: c.doc_type,
    docNumber: c.doc_number,
    docDeliveryDate: c.doc_delivery_date,
    docExpiry: c.doc_expiry,
    docDeliveryAddress: c.doc_delivery_address,
    photo: c.photo_url,
  };
}
```

Apply similar mappers for cars (`keysCount` → `keys_count`, `carImage` stays the same), purchases, sales, workers, suppliers, etc.

**Option B:** Enable automatic camelCase in Supabase client (not built-in, but you can write a global response interceptor).

Use Option A as it's explicit and safe.

---

## STEP 10 — Remove vite proxy / backend dependency

In `vite.config.js`, remove the `proxy` configuration for `/api`. The app no longer needs a backend.

```js
// vite.config.js — remove or comment out:
// server: {
//   proxy: {
//     '/api': 'http://localhost:3000',
//   },
// },
```

---

## STEP 11 — Auth guard update

Update `ProtectedRoute` in `App.jsx`:

```jsx
function ProtectedRoute({ children }) {
  const { user, authChecked, loadMe } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (!authChecked) loadMe();
  }, [authChecked, loadMe]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-text-muted heading">Chargement...</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
```

Also add a Supabase auth state listener in `main.jsx`:

```js
import { supabase } from './lib/supabase.js';
import { useStore } from './store/useStore.js';

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    useStore.getState().setUser(null);
  }
});
```

---

## STEP 12 — Run and test

```bash
cd frontend
npm run dev
```

Test in order:
1. Login page → Register a new admin account
2. Settings → upload logo → verify it shows in the Login header
3. Purchase → create a new purchase with car images and documents
4. Showroom → verify images load from Supabase bucket URLs
5. POS → sell a car to a client with a photo
6. Clients → verify client photo displays from client-photos bucket
7. Website (/website) → verify car images display publicly without login

---

## IMPORTANT NOTES FOR CLAUDE CODE

1. **Do not delete any UI components** — only replace API calls and data mapping.
2. **Keep all existing routing, styling, animations** exactly as they are.
3. **Image URLs are always full HTTPS URLs** from Supabase — never relative paths.
4. **The `useFetch` hook signature changes**: it now takes a `fetchFn` (async function) instead of a URL string. Update all call sites:
   ```js
   // Old: const { data } = useFetch('/cars');
   // New: const { data } = useFetch(() => carsApi.list(), []);
   ```
5. **camelCase mapping is critical** — do it consistently or the UI will show undefined values everywhere.
6. **No backend server is needed** — Supabase handles auth, database, and file storage directly.