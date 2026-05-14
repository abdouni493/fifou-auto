# Remaining Sections - Implementation Guide

## SECTION 3: Reports.tsx - Password Gate & Enhanced Reporting

### Key Changes Needed:

1. **Add at the TOP of the Reports component:**

```tsx
const [isUnlocked, setIsUnlocked] = useState(false);
const [passwordInput, setPasswordInput] = useState('');
const [pwError, setPwError] = useState(false);

const handleUnlock = async () => {
  setPwError(false);
  const username = localStorage.getItem('autolux_user_name');
  const { data } = await supabase
    .from('workers')
    .select('password')
    .eq('username', username)
    .maybeSingle();
  
  if (data && data.password === passwordInput) {
    setIsUnlocked(true);
  } else {
    setPwError(true);
    setPasswordInput('');
  }
};

if (!isUnlocked) return (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-16 max-w-md w-full text-center space-y-8 animate-in zoom-in-95">
      <div className="text-6xl">🔐</div>
      <div>
        <h2 className="text-3xl font-black text-white">Accès Restreint</h2>
        <p className="text-slate-400 mt-2">Entrez votre mot de passe admin pour accéder aux rapports</p>
      </div>
      <div className="space-y-4">
        <input
          type="password"
          value={passwordInput}
          onChange={e => setPasswordInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          placeholder="Mot de passe..."
          className={`w-full bg-white/5 border ${pwError ? 'border-red-500' : 'border-white/10'} text-white placeholder-slate-500 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-semibold text-center text-xl tracking-widest`}
        />
        {pwError && <p className="text-red-400 text-sm font-bold">❌ Mot de passe incorrect</p>}
        <button onClick={handleUnlock} className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black rounded-2xl py-4 hover:scale-105 transition-all">
          🔓 Déverrouiller les Rapports
        </button>
      </div>
    </div>
  </div>
);
```

2. **Update generateReport() Promise.all to include:**

```tsx
supabase.from('purchases').select('id, make, model, year, color, mileage, vin, totalCost, sellingPrice, images, dateAdded, is_sold'),
supabase.from('sales').select('id, car_id, first_name, last_name, telephone, total_price, amount_paid, balance, created_at'),
```

3. **Add new sections BEFORE the download button:**

```tsx
{/* CARS SOLD IN PERIOD */}
<div className="space-y-4 mb-8">
  <h3 className="text-white font-black text-lg uppercase tracking-widest">🏪 Véhicules Vendus</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {sales.map(sale => {
      const car = purchases.find(p => p.id === sale.car_id);
      const profit = Number(sale.total_price) - Number(car?.totalCost || 0);
      return (
        <div key={sale.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all">
          {car?.images && <img src={JSON.parse(car.images)[0]} className="w-full h-32 object-cover rounded-xl mb-3" />}
          <p className="text-white font-black text-sm">{car?.make} {car?.model} {car?.year}</p>
          <div className="flex justify-between items-center mt-2 text-xs">
            <span className="text-slate-400">Coût: {Number(car?.totalCost).toLocaleString()} DA</span>
            <span className={`font-black ${profit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              +{profit.toLocaleString()} DA ({((profit / Number(car?.totalCost)) * 100).toFixed(1)}%)
            </span>
          </div>
          <p className="text-slate-500 text-[10px] mt-2">Client: {sale.first_name} {sale.last_name}</p>
        </div>
      );
    })}
  </div>
</div>

{/* CARS IN STOCK */}
<div className="space-y-4 mb-8">
  <h3 className="text-white font-black text-lg uppercase tracking-widest">🚗 Stock Actif</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {purchases.filter(p => !p.is_sold).map(car => {
      const daysInStock = Math.floor((new Date().getTime() - new Date(car.dateAdded).getTime()) / (1000 * 60 * 60 * 24));
      const statusColor = daysInStock < 30 ? 'bg-emerald-500/20 text-emerald-300' : daysInStock < 60 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300';
      return (
        <div key={car.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
          {car.images && <img src={JSON.parse(car.images)[0]} className="w-full h-32 object-cover rounded-xl mb-3" />}
          <p className="text-white font-black text-sm">{car.make} {car.model} {car.year}</p>
          <p className={`text-xs font-black px-2 py-1 rounded-xl w-fit mt-2 ${statusColor}`}>{daysInStock} jours</p>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-slate-400">Coût: {Number(car.totalCost).toLocaleString()} DA</span>
            <span className="text-indigo-400">Prix: {Number(car.sellingPrice).toLocaleString()} DA</span>
          </div>
        </div>
      );
    })}
  </div>
</div>

{/* CARS PURCHASED IN PERIOD */}
<div className="space-y-4 mb-8">
  <h3 className="text-white font-black text-lg uppercase tracking-widest">🛒 Achats de la Période</h3>
  <div className="space-y-2">
    {purchases.map(car => (
      <div key={car.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between">
        <span className="text-white font-black text-sm">{car.make} {car.model} • {car.year}</span>
        <span className="text-indigo-400 font-black">{Number(car.totalCost).toLocaleString()} DA</span>
      </div>
    ))}
  </div>
</div>

{/* FINANCIAL ANALYSIS - COLLAPSIBLE */}
<details className="group">
  <summary className="text-white font-black text-lg uppercase tracking-widest cursor-pointer">📊 Analyse Financière</summary>
  <div className="space-y-6 mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
    {/* Existing financial breakdown goes here */}
  </div>
</details>
```

---

## SECTION 5: Purchase.tsx - Form Reorganization

### High-level structure (update the form rendering section):

```tsx
<form onSubmit={handleSubmit} className="space-y-8">
  {/* SECTION A */}
  <SectionCard title="🚗 Identité du Véhicule" icon="🏎️">
    <FieldRow>
      <FormInput label="Marque 🏷️" value={formData.make} onChange={(e) => setFormData({...formData, make: e.target.value})} />
      <FormInput label="Modèle" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} />
    </FieldRow>
    <FieldRow>
      <FormInput label="Année" type="number" min="1900" max="2026" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} />
      <FormInput label="Kilométrage 📏" type="number" value={formData.mileage} onChange={(e) => setFormData({...formData, mileage: e.target.value})} suffix="km" />
    </FieldRow>
    <FieldRow>
      <FormInput label="Couleur 🎨" type="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} />
      <FormInput label="VIN/Numéro de Série 🔢" value={formData.vin} onChange={(e) => setFormData({...formData, vin: e.target.value})} />
    </FieldRow>
    <FormSelect label="Motorisation ⚡" value={formData.engineType} onChange={(e) => setFormData({...formData, engineType: e.target.value})}>
      <option>Essence</option>
      <option>Diesel</option>
      <option>Électrique</option>
      <option>Hybride</option>
    </FormSelect>
  </SectionCard>

  {/* SECTION B */}
  <SectionCard title="📋 État & Équipement" icon="🔧">
    <FormRadio label="Condition" options={['Excellent', 'Bon', 'Moyen', 'À réviser']} value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})} />
    <FormTextarea label="Options/Équipements" placeholder="ex: Climatisation, GPS, Caméra recul..." value={formData.equipment} onChange={(e) => setFormData({...formData, equipment: e.target.value})} />
    <FormTextarea label="Observations" value={formData.observations} onChange={(e) => setFormData({...formData, observations: e.target.value})} />
    <FormSelect label="Provenance 🌍" value={formData.origin} onChange={(e) => setFormData({...formData, origin: e.target.value})}>
      <option>Particulier</option>
      <option>Concessionnaire</option>
      <option>Enchères</option>
      <option>Import</option>
    </FormSelect>
    <FormInput label="Date d'achat" type="date" value={formData.dateAdded} onChange={(e) => setFormData({...formData, dateAdded: e.target.value})} />
  </SectionCard>

  {/* SECTION C */}
  <SectionCard title="💰 Finances" icon="💰">
    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 space-y-4">
      <FormInput label="Prix d'Achat" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} suffix="DA" />
      <FormInput label="Frais de Transport" type="number" value={transportFees} onChange={(e) => setTransportFees(Number(e.target.value))} suffix="DA" />
      <FormInput label="Frais de Réparation/Remise en État" type="number" value={repairFees} onChange={(e) => setRepairFees(Number(e.target.value))} suffix="DA" />
      <FormInput label="Frais Divers" type="number" value={miscFees} onChange={(e) => setMiscFees(Number(e.target.value))} suffix="DA" />
      
      {/* Auto-calculated total */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
        <p className="text-slate-400 text-xs uppercase font-black">Coût Total</p>
        <p className="text-3xl font-black text-indigo-400">{(purchasePrice + transportFees + repairFees + miscFees).toLocaleString()} DA</p>
      </div>

      <FormInput label="Prix de Vente Souhaité" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} suffix="DA" />
      
      {/* Auto-calculated margin */}
      <div className={`bg-white/5 border rounded-2xl p-4 text-center ${estimatedMargin > 0 ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
        <p className="text-slate-400 text-xs uppercase font-black">Marge Estimée</p>
        <p className={`text-3xl font-black ${estimatedMargin > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {estimatedMargin.toLocaleString()} DA
        </p>
      </div>
    </div>
  </SectionCard>

  {/* SECTION D */}
  <SectionCard title="📷 Photos du Véhicule" icon="📷">
    <ImageUploadZone onFilesSelected={handlePhotosUpload} maxFiles={10} />
    <div className="grid grid-cols-3 gap-3">
      {formData.images?.map((img, i) => (
        <div key={i} className="relative group rounded-2xl overflow-hidden">
          <img src={img} className="w-full h-24 object-cover" />
          <button 
            type="button"
            onClick={() => setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)})}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-2xl"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </SectionCard>

  {/* SECTION E */}
  <SectionCard title="🤝 Fournisseur" icon="🤝">
    <FormSelect label="Fournisseur" value={formData.supplierId} onChange={(e) => setFormData({...formData, supplierId: e.target.value})}>
      <option>Sélectionner...</option>
      {suppliers.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </FormSelect>
    <FormInput label="Contact Fournisseur" value={supplierContact} disabled placeholder="Auto-filled" />
  </SectionCard>

  {/* SUBMIT */}
  <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-lg rounded-2xl py-6 shadow-2xl shadow-indigo-500/30 hover:scale-105 transition-all flex items-center justify-center gap-3">
    💾 Enregistrer le Véhicule
  </button>
</form>
```

### Purchase List Improvements:

```tsx
{/* SEARCH & FILTER BAR */}
<div className="flex gap-4 mb-6">
  <input
    type="text"
    placeholder="🔍 Rechercher par marque, modèle, VIN..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="flex-1 bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-semibold"
  />
  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className="bg-white/5 border border-white/10 text-white rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-semibold"
  >
    <option value="all">Tous</option>
    <option value="instock">En Stock</option>
    <option value="sold">Vendu</option>
  </select>
</div>

{/* CAR CARDS GRID */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {filteredCars.map(car => (
    <div key={car.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all group">
      {/* Image */}
      {car.images && <img src={JSON.parse(car.images)[0]} className="w-full h-32 object-cover" />}
      
      {/* Content */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <p className="text-white font-black text-sm">{car.make} {car.model}</p>
          <span className={`text-xs font-black px-2 py-1 rounded-full ${car.is_sold ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {car.is_sold ? '🔴 Vendu' : '🟢 En Stock'}
          </span>
        </div>
        <p className="text-slate-400 text-xs mb-3">{car.year} • {car.color}</p>
        <div className="flex justify-between text-xs mb-4">
          <span className="text-slate-400">Coût: {Number(car.totalCost).toLocaleString()} DA</span>
          <span className="text-indigo-400 font-black">Prix: {Number(car.sellingPrice).toLocaleString()} DA</span>
        </div>
        
        {/* Actions - only visible on hover */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button className="flex-1 bg-indigo-500/20 text-indigo-300 py-2 rounded-xl text-xs font-black hover:bg-indigo-500/40">✏️ Edit</button>
          <button className="flex-1 bg-slate-500/20 text-slate-300 py-2 rounded-xl text-xs font-black hover:bg-slate-500/40">👁️ View</button>
          <button className="flex-1 bg-red-500/20 text-red-300 py-2 rounded-xl text-xs font-black hover:bg-red-500/40">🗑️ Delete</button>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## SECTION 6: POS.tsx - Form Sections & Summary Box

### Car Selection Panel - Updated:

```tsx
{/* SEARCH BAR */}
<input
  type="text"
  placeholder="🔍 Rechercher par marque, modèle, couleur, VIN..."
  value={carSearchQuery}
  onChange={(e) => setCarSearchQuery(e.target.value)}
  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 font-semibold mb-6"
/>

{/* CAR GRID */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {filteredInventory.length === 0 ? (
    <div className="col-span-full text-center py-12 text-slate-400">
      <p className="text-4xl mb-2">🚗</p>
      <p className="font-black">Stock vide</p>
    </div>
  ) : (
    filteredInventory.map(car => (
      <button
        key={car.id}
        onClick={() => setSelectedCar(car)}
        className={`p-4 rounded-2xl border-2 transition-all text-left ${
          selectedCar?.id === car.id
            ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/20'
            : 'bg-white/5 border-white/10 hover:bg-white/10'
        }`}
      >
        {car.images && <img src={JSON.parse(car.images)[0]} className="w-full h-32 object-cover rounded-xl mb-3" />}
        <p className="text-white font-black text-sm">{car.make} {car.model} {car.year}</p>
        <p className="text-slate-400 text-xs mb-2">{car.color}</p>
        <p className="text-indigo-400 font-black text-sm">💰 {Number(car.sellingPrice).toLocaleString()} DA</p>
        {selectedCar?.id === car.id && <p className="text-emerald-400 text-xs font-black mt-2">✅ Sélectionné</p>}
      </button>
    ))
  )}
</div>
```

### Sale Form - 3 Sections:

```tsx
<form onSubmit={handleCreateSale} className="space-y-8">
  {/* SECTION A */}
  <SectionCard title="👤 Informations Acheteur" icon="👤">
    <FieldRow>
      <FormRadio label="Civilité" options={['M', 'Mme']} value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} />
    </FieldRow>
    <FieldRow>
      <FormInput label="Prénom" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
      <FormInput label="Nom" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
    </FieldRow>
    <FieldRow>
      <FormInput label="Téléphone" value={formData.telephone} onChange={(e) => setFormData({...formData, telephone: e.target.value})} />
      <FormInput label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
    </FieldRow>
    <FormTextarea label="Adresse complète" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
    <FormInput label="Numéro CNI / Permis 🪪" value={formData.id_number} onChange={(e) => setFormData({...formData, id_number: e.target.value})} />
    <FormSelect label="Type de document" value={formData.doc_type} onChange={(e) => setFormData({...formData, doc_type: e.target.value})}>
      <option>CNI Biométrique</option>
      <option>Permis de conduire</option>
      <option>Passeport</option>
    </FormSelect>
    <FormInput label="Date de naissance" type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
  </SectionCard>

  {/* SECTION B */}
  <SectionCard title="💰 Conditions Financières" icon="💰">
    <FormInput label="Prix Total de Vente" type="number" value={totalPrice} onChange={(e) => setTotalPrice(Number(e.target.value))} defaultValue={selectedCar?.sellingPrice} suffix="DA" />
    <FormInput label="Remise accordée" type="number" value={discount} onChange={(e) => { setDiscount(Number(e.target.value)); setTotalPrice(totalPrice - Number(e.target.value)); }} suffix="DA" />
    <FormInput label="Acompte / Versement Initial" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} suffix="DA" />
    
    {/* Auto-calculated balance */}
    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-center">
      <p className="text-slate-400 text-xs uppercase font-black">Solde Restant</p>
      <p className={`text-2xl font-black ${totalPrice - amountPaid > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
        {(totalPrice - amountPaid).toLocaleString()} DA
      </p>
      {totalPrice - amountPaid > 0 && <p className="text-amber-400 text-[10px] mt-1">⏳ À percevoir</p>}
    </div>

    <FormSelect label="Mode de Paiement" value={formData.paymentMode} onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}>
      <option>Espèces 💵</option>
      <option>Virement 🏦</option>
      <option>Chèque 📝</option>
      <option>Mixte 🔄</option>
    </FormSelect>
    <FormInput label="Date de vente" type="date" value={formData.saleDate} onChange={(e) => setFormData({...formData, saleDate: e.target.value})} />
    <FormTextarea label="Observations / Notes de vente" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
  </SectionCard>

  {/* SECTION C */}
  <SectionCard title="📄 Options Facture" icon="📄">
    <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl cursor-pointer">
      <input type="checkbox" checked={formData.includeChecklist} onChange={(e) => setFormData({...formData, includeChecklist: e.target.checked})} className="w-5 h-5 rounded" />
      <span className="text-white font-black text-sm">✅ Inclure checklist de livraison</span>
    </label>
    <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl cursor-pointer">
      <input type="checkbox" checked={formData.includeSpecs} onChange={(e) => setFormData({...formData, includeSpecs: e.target.checked})} className="w-5 h-5 rounded" />
      <span className="text-white font-black text-sm">🔧 Afficher les détails techniques</span>
    </label>
  </SectionCard>

  {/* SUBMIT */}
  <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-lg rounded-2xl py-6 shadow-2xl shadow-indigo-500/30 hover:scale-105 transition-all">
    💾 Créer la Vente
  </button>
</form>
```

### Sticky Financial Summary Box (at bottom of form):

```tsx
<div className="sticky bottom-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 flex flex-wrap gap-6 items-center justify-between shadow-2xl">
  <div className="text-center">
    <p className="text-slate-400 text-xs uppercase font-black">Prix Total</p>
    <p className="text-white text-2xl font-black">{totalPrice.toLocaleString()} DA</p>
  </div>
  <div className="text-center">
    <p className="text-slate-400 text-xs uppercase font-black">Acompte</p>
    <p className="text-emerald-400 text-2xl font-black">{amountPaid.toLocaleString()} DA</p>
  </div>
  <div className="text-center">
    <p className="text-slate-400 text-xs uppercase font-black">Solde</p>
    <p className={`text-2xl font-black ${(totalPrice - amountPaid) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
      {(totalPrice - amountPaid).toLocaleString()} DA
    </p>
  </div>
  <div className="text-center">
    <p className="text-slate-400 text-xs uppercase font-black">Marge</p>
    <p className={`text-2xl font-black ${(totalPrice - (selectedCar?.totalCost||0)) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
      {(totalPrice - Number(selectedCar?.totalCost||0)).toLocaleString()} DA
    </p>
  </div>
</div>
```

---

## 📚 Helper Components (Reusable)

Create these as utility components in `components/FormComponents.tsx`:

```tsx
export const SectionCard = ({ title, icon, children }: any) => (
  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6">
    <div className="flex items-center gap-3">
      <span className="text-3xl">{icon}</span>
      <h3 className="text-white font-black text-lg uppercase tracking-widest">{title}</h3>
    </div>
    {children}
  </div>
);

export const FormInput = ({ label, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">{label}</label>
    <input {...props} className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-semibold transition-all" />
  </div>
);

export const FormTextarea = ({ label, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-2">{label}</label>
    <textarea {...props} className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-semibold transition-all resize-none h-24" />
  </div>
);

export const FieldRow = ({ children }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {children}
  </div>
);
```

---

## 🎯 Quick Reference - Class Names to Use

```tsx
// Dark glass card
"bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl"

// Input field
"w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-semibold"

// Gradient button
"bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black rounded-2xl py-4 hover:scale-105 transition-all shadow-lg shadow-indigo-500/30"

// Secondary button
"bg-white/10 text-white font-black rounded-2xl py-4 hover:bg-white/20 transition-all"

// Section header
"text-white font-black text-lg uppercase tracking-widest"

// Muted text
"text-slate-400 text-xs font-bold"
```

---

Good luck with the remaining implementations! The foundation is solid and all the patterns have been established.
