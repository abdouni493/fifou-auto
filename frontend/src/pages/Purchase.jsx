import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Trash2, Printer, Wallet, Plus, Factory, User, Check, X, KeyRound, FileText, Upload, LayoutGrid, Table as TableIcon } from "lucide-react";
import { carsApi, purchasesApi, suppliersApi, clientsApi, inspectionApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { useStore } from "../store/useStore.js";
import { Card, Badge, Modal, ConfirmModal, Field, EmptyState, SkeletonGrid, Stepper, Toggle, AnimatedGrid, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ActionMenu from "../components/ActionMenu.jsx";
import SearchSelect from "../components/SearchSelect.jsx";
import ClientForm, { validateClient } from "../components/ClientForm.jsx";
import { MultiImageUpload } from "../components/ImageUpload.jsx";
import InspectionChecklist, { DEFAULT_INSPECTION } from "../components/InspectionChecklist.jsx";
import { CarImage } from "../components/CarCard.jsx";
import { PurchaseInvoice } from "../components/PrintTemplates.jsx";
import { usePrintDialog, printInLang } from "../components/PrintChooser.jsx";
import { formatAmount, formatDate, toDateTimeLocal } from "../utils/format.js";

const FILTERS = [
  { key: "", tkey: "common.all" },
  { key: "sourceType=SUPPLIER", tkey: "purchase.filterSupplier" },
  { key: "sourceType=CLIENT", tkey: "purchase.filterClient" },
  { key: "paid=PAID", tkey: "purchase.filterPaid" },
  { key: "paid=DEBT", tkey: "purchase.filterDebt" },
];

const ENERGIES = [["ESSENCE", "energy.ESSENCE"], ["DIESEL", "energy.DIESEL"], ["HYBRID", "energy.HYBRID"], ["ELECTRIC", "energy.ELECTRIC"]];
const GEARBOXES = [["MANUAL", "gearbox.MANUAL"], ["AUTO", "gearbox.AUTO"]];

function NewPurchase({ onClose, onCreated }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [sourceType, setSourceType] = useState("SUPPLIER");
  const [supplier, setSupplier] = useState(null);
  const [client, setClient] = useState(null);
  const [newSupplier, setNewSupplier] = useState(null);
  const [newClient, setNewClient] = useState(null);
  const [clientErrors, setClientErrors] = useState({});
  const [car, setCar] = useState({ images: [], energy: "ESSENCE", gearbox: "MANUAL", keysCount: "", documents: [] });
  const [pricing, setPricing] = useState({ purchasePrice: "", sellingPrice: "", amountPaid: "" });
  const [inspection, setInspection] = useState(DEFAULT_INSPECTION);
  const [date, setDate] = useState(toDateTimeLocal());
  const [saving, setSaving] = useState(false);

  // Load the saved checklist template so items added on a previous purchase/sale
  // reappear here. Falls back to DEFAULT_INSPECTION when none is stored yet.
  useEffect(() => {
    inspectionApi.getTemplate().then((tpl) => { if (tpl) setInspection(tpl); }).catch(() => {});
  }, []);
  // Persist add/remove of checklist items so they're remembered next time.
  const persistInspection = (next) => { inspectionApi.saveTemplate(next).catch(() => {}); };

  // documents
  const { data: docTypes, refetch: refetchTypes } = useFetch(() => carsApi.getDocumentTypes(), []);
  const [docType, setDocType] = useState("");
  const [newDocType, setNewDocType] = useState("");
  const [showNewDocType, setShowNewDocType] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const setCarField = (f) => (e) => setCar({ ...car, [f]: e.target.value });
  // purchase price drives the editable "montant versé" default
  const setPurchasePrice = (v) => setPricing({ ...pricing, purchasePrice: v, amountPaid: v });
  const rest = Math.max(0, (Number(pricing.purchasePrice) || 0) - (Number(pricing.amountPaid) || 0));

  const createDocType = async () => {
    if (!newDocType.trim()) return;
    const data = await carsApi.createDocumentType(newDocType.trim());
    await refetchTypes();
    setDocType(data.name);
    setNewDocType("");
    setShowNewDocType(false);
  };

  const scanDocument = async (file) => {
    if (!file || !docType) { alert("Sélectionnez d'abord un type de document"); return; }
    setUploadingDoc(true);
    try {
      const url = await carsApi.uploadDocument(null, file);
      setCar((c) => ({ ...c, documents: [...(c.documents || []), { type: docType, url }] }));
    } catch (e) {
      alert(e?.message || "Erreur lors du téléchargement du document");
    } finally {
      setUploadingDoc(false);
    }
  };

  const saveSupplier = async () => {
    try {
      const data = await suppliersApi.create(newSupplier);
      setSupplier(data);
      setNewSupplier(null);
    } catch (e) { alert(e.message || "Erreur"); }
  };
  const saveClient = async () => {
    const errs = validateClient(newClient || {});
    if (Object.keys(errs).length) { setClientErrors(errs); return; }
    try {
      const data = await clientsApi.create(newClient);
      setClient(data);
      setNewClient(null);
    } catch (e) { alert(e.message || "Erreur"); }
  };

  const canNext1 = sourceType === "SUPPLIER" ? !!supplier : !!client;

  const create = async () => {
    setSaving(true);
    try {
      const payload = {
        sourceType,
        supplierId: sourceType === "SUPPLIER" ? supplier?.id : null,
        clientId: sourceType === "CLIENT" ? client?.id : null,
        car: { ...car, year: car.year ? Number(car.year) : null, seats: car.seats ? Number(car.seats) : null, mileage: car.mileage ? Number(car.mileage) : null },
        purchasePrice: Number(pricing.purchasePrice) || 0,
        sellingPrice: Number(pricing.sellingPrice) || 0,
        amountPaid: pricing.amountPaid === "" ? Number(pricing.purchasePrice) || 0 : Number(pricing.amountPaid),
        inspection,
        date,
      };
      const data = await purchasesApi.create(payload);
      onCreated(data);
    } catch (e) {
      alert(e.message || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-y-auto p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="max-w-4xl mx-auto my-6 glass-panel p-6"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading text-xl text-text-primary">{t("purchase.new")}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={22} /></button>
        </div>

        <Stepper steps={[t("purchase.stepSource"), t("purchase.stepVehicle"), t("purchase.stepInspection")]} current={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >

        {/* STEP 1 */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <button onClick={() => setSourceType("SUPPLIER")} className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-2 font-bold uppercase text-sm transition ${sourceType === "SUPPLIER" ? "border-violet-500 bg-violet-600/15 text-violet-300" : "border-red-600/30 text-text-muted"}`}><Factory size={18} /> {t("common.supplier")}</button>
              <button onClick={() => setSourceType("CLIENT")} className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-2 font-bold uppercase text-sm transition ${sourceType === "CLIENT" ? "border-blue-500 bg-blue-600/15 text-blue-300" : "border-red-600/30 text-text-muted"}`}><User size={18} /> {t("common.client")}</button>
            </div>

            {sourceType === "SUPPLIER" ? (
              <div>
                {supplier ? (
                  <Card className="p-4 border border-violet-500/40">
                    <div className="flex justify-between items-center">
                      <div><p className="heading text-sm text-text-primary">{supplier.fullName}</p><p className="text-xs text-text-muted">{supplier.phone} · {supplier.address}</p></div>
                      <button className="btn-ghost text-xs py-1.5" onClick={() => setSupplier(null)}>{t("common.change")}</button>
                    </div>
                  </Card>
                ) : (
                  <>
                    <SearchSelect fetcher={(q) => suppliersApi.list({ search: q })} placeholder={t("purchase.searchSupplier")} onSelect={setSupplier}
                      renderItem={(s) => <div><p className="text-sm text-text-primary">{s.fullName}</p><p className="text-xs text-text-muted">{s.phone}</p></div>} />
                    {!newSupplier ? (
                      <button className="btn-ghost w-full mt-3" onClick={() => setNewSupplier({ fullName: "", phone: "", address: "", nif: "", nis: "", article: "", rs: "" })}><Plus size={14} /> {t("purchase.newSupplier")}</button>
                    ) : (
                      <Card className="p-4 mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label={t("login.fullName")} required><input className="input" value={newSupplier.fullName} onChange={(e) => setNewSupplier({ ...newSupplier, fullName: e.target.value })} /></Field>
                          <Field label={t("common.phone")} required><input className="input" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} /></Field>
                          <Field label={t("common.address")} className="col-span-2"><input className="input" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} /></Field>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {["nif", "nis", "article", "rs"].map((f) => <Field key={f} label={f.toUpperCase()}><input className="input" value={newSupplier[f]} onChange={(e) => setNewSupplier({ ...newSupplier, [f]: e.target.value })} /></Field>)}
                        </div>
                        <div className="flex gap-2 justify-end"><button className="btn-ghost text-xs" onClick={() => setNewSupplier(null)}>{t("common.cancel")}</button><button className="btn-primary text-xs" onClick={saveSupplier}>{t("common.save")}</button></div>
                      </Card>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div>
                {client ? (
                  <Card className="p-4 border border-blue-500/40">
                    <div className="flex justify-between items-center">
                      <div><p className="heading text-sm text-text-primary">{client.firstName} {client.lastName}</p><p className="text-xs text-text-muted">{client.phonePrimary}</p></div>
                      <button className="btn-ghost text-xs py-1.5" onClick={() => setClient(null)}>{t("common.change")}</button>
                    </div>
                  </Card>
                ) : (
                  <>
                    <SearchSelect fetcher={(q) => clientsApi.search(q)} placeholder={t("purchase.searchClient")} onSelect={setClient}
                      renderItem={(c) => <div><p className="text-sm text-text-primary">{c.firstName} {c.lastName}</p><p className="text-xs text-text-muted">{c.phonePrimary}</p></div>} />
                    {!newClient ? (
                      <button className="btn-ghost w-full mt-3" onClick={() => setNewClient({})}><Plus size={14} /> {t("purchase.newClient")}</button>
                    ) : (
                      <Card className="p-4 mt-3">
                        <ClientForm value={newClient} onChange={setNewClient} errors={clientErrors} />
                        <div className="flex gap-2 justify-end mt-3"><button className="btn-ghost text-xs" onClick={() => setNewClient(null)}>{t("common.cancel")}</button><button className="btn-primary text-xs" onClick={saveClient}>{t("common.save")}</button></div>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button className="btn-primary" disabled={!canNext1} onClick={() => setStep(1)}>{t("common.next")} →</button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="label-caps">{t("car.images")}</p>
              <MultiImageUpload value={car.images} onChange={(images) => setCar({ ...car, images })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("car.brand")} required><input className="input" value={car.brand || ""} onChange={setCarField("brand")} /></Field>
              <Field label={t("car.model")} required><input className="input" value={car.model || ""} onChange={setCarField("model")} /></Field>
              <Field label={t("car.plate")}><input className="input" value={car.plate || ""} onChange={setCarField("plate")} /></Field>
              <Field label={t("car.year")}><input className="input" type="number" value={car.year || ""} onChange={setCarField("year")} /></Field>
              <Field label={t("car.color")}><input className="input" value={car.color || ""} onChange={setCarField("color")} /></Field>
              <Field label={t("car.vin")}><input className="input" value={car.vin || ""} onChange={setCarField("vin")} /></Field>
              <Field label={t("car.fiche")} className="sm:col-span-2"><textarea className="input" rows={2} value={car.fiche || ""} onChange={setCarField("fiche")} /></Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="label-caps">{t("car.energy")}</p>
                <div className="flex flex-wrap gap-2">{ENERGIES.map(([v, l]) => <button key={v} className={`chip ${car.energy === v ? "chip-active" : ""}`} onClick={() => setCar({ ...car, energy: v })}>{t(l)}</button>)}</div>
              </div>
              <div>
                <p className="label-caps">{t("car.gearbox")}</p>
                <div className="flex flex-wrap gap-2">{GEARBOXES.map(([v, l]) => <button key={v} className={`chip ${car.gearbox === v ? "chip-active" : ""}`} onClick={() => setCar({ ...car, gearbox: v })}>{t(l)}</button>)}</div>
              </div>
              <Field label={t("car.seats")}><input className="input" type="number" value={car.seats || ""} onChange={setCarField("seats")} /></Field>
              <Field label={t("car.mileage")}><input className="input" type="number" value={car.mileage || ""} onChange={setCarField("mileage")} /></Field>
            </div>

            {/* Keys & documents */}
            <div className="flex items-center gap-3 my-2"><span className="label-caps !mb-0">{t("purchase.keysAndDocs")}</span><div className="flex-1 h-px bg-red-600/20" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("car.keys")}>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500/70" size={15} />
                  <input className="input pl-9" type="number" min="0" value={car.keysCount} onChange={setCarField("keysCount")} placeholder="2" />
                </div>
              </Field>
              <div>
                <div className="flex items-center justify-between">
                  <span className="label-caps">{t("car.docType")}</span>
                  <button type="button" className="text-[0.6rem] text-red-400 hover:text-red-300 uppercase tracking-wider font-bold" onClick={() => setShowNewDocType((s) => !s)}>{t("car.newDocType")}</button>
                </div>
                <div className="flex gap-2">
                  <select className="input flex-1" value={docType} onChange={(e) => setDocType(e.target.value)}>
                    <option value="">— {t("common.choose")} —</option>
                    {(docTypes || []).map((dt) => <option key={dt.id} value={dt.name}>{dt.name}</option>)}
                  </select>
                  <label className={`btn-ghost text-xs py-2 px-3 cursor-pointer ${!docType ? "opacity-50" : ""}`}>
                    <Upload size={14} /> {uploadingDoc ? "..." : t("car.scan")}
                    <input type="file" accept="image/*" className="hidden" disabled={!docType} onChange={(e) => scanDocument(e.target.files[0])} />
                  </label>
                </div>
                {showNewDocType && (
                  <div className="flex gap-2 mt-2">
                    <input className="input flex-1" placeholder={t("car.docTypeName")} value={newDocType} onChange={(e) => setNewDocType(e.target.value)} />
                    <button type="button" className="btn-primary text-xs py-2 px-3" onClick={createDocType}>{t("common.create")}</button>
                  </div>
                )}
              </div>
            </div>
            {(car.documents || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {car.documents.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 glass-card !rounded-lg px-2.5 py-1.5">
                    <FileText size={14} className="text-blue-400" />
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-text-primary hover:underline">{d.type}</a>
                    <button type="button" onClick={() => setCar((c) => ({ ...c, documents: c.documents.filter((_, idx) => idx !== i) }))} className="text-text-muted hover:text-rose-400"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 my-2"><span className="label-caps !mb-0">{t("purchase.pricing")}</span><div className="flex-1 h-px bg-red-600/20" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label={sourceType === "CLIENT" ? t("purchase.clientProposedPrice") : t("showroom.purchasePrice")} required><input className="input" type="number" value={pricing.purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} /></Field>
              <Field label={t("showroom.sellingPrice")}><input className="input" type="number" value={pricing.sellingPrice} onChange={(e) => setPricing({ ...pricing, sellingPrice: e.target.value })} /></Field>
              <Field label={t("purchase.amountPaid")}><input className="input" type="number" value={pricing.amountPaid} onChange={(e) => setPricing({ ...pricing, amountPaid: e.target.value })} /></Field>
            </div>
            <p className="text-sm">{t("purchase.remaining")} : <span className={rest > 0 ? "text-rose-400 font-black" : "text-emerald-400 font-black"}>{formatAmount(rest)}</span></p>

            <div className="flex justify-between pt-4">
              <button className="btn-ghost" onClick={() => setStep(0)}>← {t("common.back")}</button>
              <button className="btn-primary" disabled={!car.brand || !car.model || !pricing.purchasePrice} onClick={() => setStep(2)}>{t("common.next")} →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <div className="space-y-5">
            <InspectionChecklist value={inspection} onChange={setInspection} onPersist={persistInspection} />
            <Field label={t("purchase.purchaseDate")}><input type="datetime-local" className="input sm:max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <div className="flex justify-between pt-4">
              <button className="btn-ghost" onClick={() => setStep(1)}>← {t("common.back")}</button>
              <button className="btn-primary" onClick={create} disabled={saving}>{saving ? "..." : t("purchase.createPurchase")}</button>
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default function Purchase() {
  const { t } = useTranslation();
  const can = useCan();
  const { settings } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const { data: purchases, loading, refetch } = useFetch(() => {
    const params = { search };
    if (filter.startsWith("sourceType=")) params.sourceType = filter.split("=")[1];
    if (filter.startsWith("paid=")) params.paid = filter.split("=")[1];
    return purchasesApi.list(params);
  }, [filter, search]);
  const [showNew, setShowNew] = useState(false);
  const [createdPrompt, setCreatedPrompt] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [viewItem, setViewItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [view, setView] = useState("cards");

  const openPrint = usePrintDialog();
  const renderInvoice = (p) => (lang) => <PurchaseInvoice purchase={p} showroom={settings} lang={lang} />;
  // Print buttons open a French / Arabic chooser first.
  const doPrint = (p) => openPrint(renderInvoice(p));

  const menuItems = (p) => [
    { label: t("common.view"), icon: Eye, onClick: () => setViewItem(p) },
    can("purchase", "print") && { label: t("common.print"), icon: Printer, onClick: () => doPrint(p) },
    can("purchase", "edit") && p.amountRest > 0 && { label: t("common.payDebt"), icon: Wallet, onClick: () => { setPayTarget(p); setPayAmount(String(p.amountRest)); } },
    can("purchase", "delete") && { label: t("common.delete"), icon: Trash2, danger: true, onClick: () => setDeleteId(p.id) },
  ];

  const pay = async () => {
    await purchasesApi.addPayment(payTarget.id, Number(payAmount));
    setPayTarget(null); setPayAmount(""); refetch();
    toast(t("purchase.debtPaidToast"));
  };

  const confirmDelete = async () => {
    await purchasesApi.delete(deleteId);
    setDeleteId(null); refetch();
    toast(t("purchase.deletedToast"), "info");
  };

  return (
    <div>
      <PageHeader title={t("nav.purchase")} action={can("purchase", "create") ? () => setShowNew(true) : undefined} actionLabel={t("purchase.new")} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => <button key={f.key} className={`chip ${filter === f.key ? "chip-active" : ""}`} onClick={() => setFilter(f.key)}>{t(f.tkey)}</button>)}
        </div>
        <input className="input sm:max-w-xs sm:ml-auto rtl:sm:ml-0 rtl:sm:mr-auto" placeholder={t("purchase.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          <button className={`chip ${view === "cards" ? "chip-active" : ""}`} onClick={() => setView("cards")}><LayoutGrid size={14} /></button>
          <button className={`chip ${view === "table" ? "chip-active" : ""}`} onClick={() => setView("table")}><TableIcon size={14} /></button>
        </div>
      </div>

      {loading ? <SkeletonGrid /> : purchases?.length === 0 ? (
        <EmptyState message={t("purchase.noPurchase")} cta={can("purchase", "create") ? t("purchase.new") : undefined} onCta={() => setShowNew(true)} />
      ) : view === "table" ? (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left rtl:text-right border-b border-red-600/20 text-text-muted">
              {["N°", t("common.vehicle"), t("purchase.source"), t("common.price"), t("common.paid"), t("common.rest"), t("common.date"), ""].map((h, i) => <th key={i} className="p-3 label-caps">{h}</th>)}
            </tr></thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-red-600/10 hover:bg-red-600/5">
                  <td className="p-3 text-text-muted">{p.reference}</td>
                  <td className="p-3 text-text-primary">{p.car?.brand} {p.car?.model} <span className="text-text-muted">{p.car?.plate}</span></td>
                  <td className="p-3"><Badge color={p.sourceType === "SUPPLIER" ? "supplier" : "info"}>{p.sourceType === "SUPPLIER" ? t("common.supplier") : t("common.client")}</Badge></td>
                  <td className="p-3 text-text-primary">{formatAmount(p.purchasePrice)}</td>
                  <td className="p-3 text-emerald-400">{formatAmount(p.amountPaid)}</td>
                  <td className="p-3 text-rose-400">{formatAmount(p.amountRest)}</td>
                  <td className="p-3 text-text-muted">{formatDate(p.date)}</td>
                  <td className="p-3"><ActionMenu items={menuItems(p)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <AnimatedGrid className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {purchases.map((p) => (
            <Card key={p.id} className="p-4 flex gap-4">
              <div className="w-28 h-20 rounded-lg overflow-hidden shrink-0"><CarImage images={p.car?.images} heightClass="h-20" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="heading text-sm text-text-primary">{p.car?.brand} {p.car?.model}</p>
                    <p className="text-xs text-text-muted">{p.car?.plate} · {p.car?.year} · {p.reference}</p>
                  </div>
                  <ActionMenu items={menuItems(p)} />
                </div>
                <div className="flex gap-1.5 my-2">
                  <Badge color={p.sourceType === "SUPPLIER" ? "supplier" : "info"}>{p.sourceType === "SUPPLIER" ? t("common.supplier") : t("common.client")}</Badge>
                  {p.amountRest > 0 ? <Badge color="debt">{t("purchase.filterDebt")}</Badge> : <Badge color="success">{t("purchase.filterPaid")}</Badge>}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">{formatDate(p.date)}</span>
                  <span className="text-text-primary">{formatAmount(p.purchasePrice)} {p.amountRest > 0 && <span className="text-rose-400">· {t("common.rest")} {formatAmount(p.amountRest)}</span>}</span>
                </div>
              </div>
            </Card>
          ))}
        </AnimatedGrid>
      )}

      <AnimatePresence>
        {showNew && <NewPurchase onClose={() => setShowNew(false)} onCreated={(p) => { setShowNew(false); refetch(); setCreatedPrompt(p); toast(t("purchase.createdToast")); }} />}
      </AnimatePresence>

      {/* Print prompt */}
      <Modal open={!!createdPrompt} onClose={() => setCreatedPrompt(null)} title={t("purchase.created")} size="sm"
        footer={<>
          <button className="btn-ghost" onClick={() => setCreatedPrompt(null)}>{t("common.skip")}</button>
          <button className="btn-ghost" onClick={() => { printInLang(renderInvoice(createdPrompt), "ar"); setCreatedPrompt(null); }}><Printer size={14} /> {t("common.printAr")}</button>
          <button className="btn-primary" onClick={() => { printInLang(renderInvoice(createdPrompt), "fr"); setCreatedPrompt(null); }}><Printer size={14} /> {t("common.printFr")}</button>
        </>}>
        <p className="text-text-muted">{t("purchase.printPrompt")}</p>
      </Modal>

      {/* Pay debt */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={t("common.payDebt")} size="sm"
        footer={<><button className="btn-ghost" onClick={() => setPayTarget(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={pay}>{t("common.validate")}</button></>}>
        {payTarget && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-text-muted">{t("common.total")}</span><span className="text-text-primary">{formatAmount(payTarget.purchasePrice)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">{t("purchase.alreadyPaid")}</span><span className="text-emerald-400">{formatAmount(payTarget.amountPaid)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">{t("common.rest")}</span><span className="text-rose-400">{formatAmount(payTarget.amountRest)}</span></div>
            <Field label={t("purchase.amountToPay")}><input className="input" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></Field>
          </div>
        )}
      </Modal>

      {/* View */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={t("purchase.detail")} size="lg">
        {viewItem && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden"><CarImage images={viewItem.car?.images} heightClass="h-48" /></div>
            <div className="grid grid-cols-2 gap-x-6">
              {Object.entries({
                [t("purchase.reference")]: viewItem.reference, [t("common.date")]: formatDate(viewItem.date),
                [t("common.vehicle")]: `${viewItem.car?.brand} ${viewItem.car?.model}`, [t("car.plate")]: viewItem.car?.plate,
                [t("purchase.source")]: viewItem.sourceType === "SUPPLIER" ? viewItem.supplier?.fullName : `${viewItem.client?.firstName} ${viewItem.client?.lastName}`,
                [t("showroom.purchasePrice")]: formatAmount(viewItem.purchasePrice), [t("showroom.sellingPrice")]: formatAmount(viewItem.sellingPrice),
                [t("common.paid")]: formatAmount(viewItem.amountPaid), [t("common.rest")]: formatAmount(viewItem.amountRest),
                [t("car.keys")]: viewItem.car?.keysCount != null ? viewItem.car.keysCount : "—",
              }).map(([k, v]) => <div key={k} className="flex justify-between text-sm border-b border-red-600/10 py-1.5"><span className="text-text-muted">{k}</span><span className="text-text-primary text-right">{v || "—"}</span></div>)}
            </div>
            {(viewItem.car?.documents || []).length > 0 && (
              <div>
                <p className="label-caps mb-2">{t("car.documentsOfVehicle")}</p>
                <div className="flex flex-wrap gap-2">
                  {viewItem.car.documents.map((d, i) => (
                    <a key={i} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 glass-card !rounded-lg px-2.5 py-1.5 hover:border-red-600/60">
                      <FileText size={14} className="text-blue-400" />
                      <span className="text-xs text-text-primary">{d.type}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <button className="btn-ghost w-full" onClick={() => doPrint(viewItem)}><Printer size={14} /> {t("purchase.printInvoice")}</button>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} message={t("purchase.deleteMsg")} />
    </div>
  );
}
