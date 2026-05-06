
import React, { useState, useEffect } from 'react';
import { PurchaseRecord, Language, SaleRecord } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';

interface ShowroomProps {
  lang: Language;
  onNavigateToPurchase: () => void;
  onEdit: (car: PurchaseRecord) => void;
}

interface SaleWithDetails extends SaleRecord {
  supplier_name?: string;
}

export const Showroom: React.FC<ShowroomProps> = ({ lang, onNavigateToPurchase, onEdit }) => {
  const t = translations[lang];
  const [inventory, setInventory] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCar, setSelectedCar] = useState<PurchaseRecord | null>(null);
  const [saleDetails, setSaleDetails] = useState<SaleWithDetails | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [showCreatedDate, setShowCreatedDate] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    else setInventory(data || []);
    setLoading(false);
  };

  const fetchSaleDetails = async (carId: string) => {
    setSaleLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('car_id', carId)
      .single();
    
    if (error) {
      console.error(error);
      setSaleDetails(null);
    } else {
      setSaleDetails(data as SaleWithDetails);
    }
    setSaleLoading(false);
  };

  const openDetails = async (car: PurchaseRecord) => {
    setSelectedCar(car);
    if (car.is_sold) {
      await fetchSaleDetails(car.id);
    }
  };

  const closeDetails = () => {
    setSelectedCar(null);
    setSaleDetails(null);
  };

  const calculateGain = (car: PurchaseRecord, saleRecord?: SaleWithDetails | null) => {
    if (saleRecord) {
      return saleRecord.total_price - car.totalCost;
    }
    return car.sellingPrice - car.totalCost;
  };

  if (loading) return <div className="text-center py-20 animate-pulse font-black text-blue-500">SYNCHRONISATION DU STOCK...</div>;

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900">{t.menu.showroom}</h2>
          <p className="text-slate-400 font-bold text-xs uppercase mt-3">Disponibilités en Temps Réel</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowCreatedDate(!showCreatedDate)}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${showCreatedDate ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            📅 {showCreatedDate ? 'Masquer' : 'Afficher'} Date Création
          </button>
          <button onClick={onNavigateToPurchase} className="custom-gradient-btn px-10 py-5 rounded-[2.5rem] text-white font-black text-sm">
            🏷️ {t.purchase.addBtn}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {inventory.map(car => (
          <div key={car.id} className="bg-white rounded-[4rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-700 flex flex-col h-full overflow-hidden relative">
            {/* Status Badge */}
            <div className="absolute top-6 right-6 z-10">
              <span className={`px-4 py-2 rounded-full text-xs font-black uppercase ${
                car.is_sold 
                  ? 'bg-red-100 text-red-700 border border-red-300' 
                  : 'bg-green-100 text-green-700 border border-green-300'
              }`}>
                {car.is_sold ? '🔴 Vendu' : '✅ Disponible'}
              </span>
            </div>

            <div className="h-72 overflow-hidden relative">
               <img src={car.photo_urls?.[0] || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1000'} className="w-full h-full object-cover" alt={car.model} />
               {showCreatedDate && car.created_at && (
                  <div className="absolute bottom-6 left-6 bg-blue-600/90 backdrop-blur-md px-3 py-1.5 rounded-full">
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">📅 {new Date(car.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
               )}
            </div>
            <div className="p-10 flex flex-col flex-grow">
               <h3 className="text-3xl font-black text-slate-900 leading-none mb-2">{car.make}</h3>
               <p className="text-xl font-bold text-slate-400 tracking-tight mb-8">{car.model}</p>
               
               {car.created_by && (
                  <div className="text-[10px] font-black text-slate-600 uppercase mb-4">
                    👤 Créé par: <span className="text-slate-800">{car.created_by}</span>
                  </div>
               )}
               
               <div className="flex justify-between items-end mb-10">
                  <div>
                     <p className="text-[10px] font-black text-slate-300 uppercase">Prix de Vente</p>
                     <p className="text-3xl font-black text-blue-600 tracking-tighter">{(car.sellingPrice || car.selling_price)?.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t.currency}</span></p>
                  </div>
                  <div className="bg-slate-50 px-4 py-2 rounded-2xl border">
                     <span className="text-xs font-black text-slate-900">{car.year}</span>
                  </div>
               </div>
               <div className="flex gap-4 mt-auto">
                 <button onClick={() => openDetails(car)} className="flex-1 py-5 rounded-[2rem] bg-blue-600 text-white font-black text-[11px] uppercase transition-all hover:bg-blue-700">👁️ Détails</button>
                 {!car.is_sold && <button onClick={() => onEdit(car)} className="flex-1 py-5 rounded-[2rem] bg-slate-900 text-white font-black text-[11px] uppercase transition-all hover:bg-slate-800">✏️ Modifier</button>}
               </div>
            </div>
          </div>
        ))}
        {inventory.length === 0 && <p className="col-span-full text-center py-20 text-slate-400 font-black">Aucun véhicule en stock.</p>}
      </div>

      {/* Details Modal */}
      {selectedCar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-8 flex justify-between items-center rounded-t-[3rem]">
              <h2 className="text-3xl font-black text-slate-900">
                {selectedCar.make} {selectedCar.model}
              </h2>
              <button onClick={closeDetails} className="text-3xl font-black text-slate-400 hover:text-slate-900">✕</button>
            </div>

            <div className="p-8 space-y-8">
              {/* Car Images */}
              {selectedCar.photo_urls && selectedCar.photo_urls.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900">Photos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCar.photo_urls.map((photo, idx) => (
                      <img key={idx} src={photo} alt={`Photo ${idx + 1}`} className="w-full h-48 object-cover rounded-2xl" />
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle Information */}
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">Informations Véhicule</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Châssis (VIN)</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.vin}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Immatriculation</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.plate}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Année</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.year}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Couleur</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.color}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Carburant</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.fuel === 'essence' ? 'Essence' : 'Diesel'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Transmission</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.transmission === 'manuelle' ? 'Manuelle' : 'Automatique'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Kilométrage</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.mileage.toLocaleString()} KM</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Portes</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.doors}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Places</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.seats}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-xs font-black text-slate-400 uppercase">Assurance</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{selectedCar.insuranceCompany}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">Informations Financières</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
                    <p className="text-xs font-black text-blue-600 uppercase">Prix d'Achat</p>
                    <p className="text-2xl font-black text-blue-900 mt-1">{selectedCar.totalCost?.toLocaleString()} <span className="text-xs text-blue-600">{t.currency}</span></p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-200">
                    <p className="text-xs font-black text-purple-600 uppercase">Prix de Vente</p>
                    <p className="text-2xl font-black text-purple-900 mt-1">{(saleDetails?.total_price || selectedCar.sellingPrice)?.toLocaleString()} <span className="text-xs text-purple-600">{t.currency}</span></p>
                  </div>
                  <div className={`p-4 rounded-2xl border-2 ${
                    calculateGain(selectedCar, saleDetails) >= 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-xs font-black uppercase ${
                      calculateGain(selectedCar, saleDetails) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>Gain / Perte</p>
                    <p className={`text-2xl font-black mt-1 ${
                      calculateGain(selectedCar, saleDetails) >= 0
                        ? 'text-green-900'
                        : 'text-red-900'
                    }`}>{calculateGain(selectedCar, saleDetails)?.toLocaleString()} <span className="text-xs">{t.currency}</span></p>
                  </div>
                </div>
              </div>

              {/* Supplier Information */}
              {selectedCar.supplierName && (
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-4">Informations Fournisseur</h3>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-900">{selectedCar.supplierName}</p>
                  </div>
                </div>
              )}

              {/* Client Information (if sold) */}
              {selectedCar.is_sold && saleDetails && (
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-4">Informations Client</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-xs font-black text-slate-400 uppercase">Nom & Prénom</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{saleDetails.last_name} {saleDetails.first_name}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-xs font-black text-slate-400 uppercase">Téléphone</p>
                      <p className="text-sm font-bold text-slate-900 mt-1">{saleDetails.mobile1}</p>
                    </div>
                    {saleDetails.mobile2 && (
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-xs font-black text-slate-400 uppercase">Téléphone 2</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{saleDetails.mobile2}</p>
                      </div>
                    )}
                    {saleDetails.address && (
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-xs font-black text-slate-400 uppercase">Adresse</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{saleDetails.address}</p>
                      </div>
                    )}
                    {saleDetails.profession && (
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-xs font-black text-slate-400 uppercase">Profession</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{saleDetails.profession}</p>
                      </div>
                    )}
                    {saleDetails.nif && (
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-xs font-black text-slate-400 uppercase">NIF</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{saleDetails.nif}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="bg-slate-50 p-6 rounded-2xl border-2">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">Statut</p>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-black uppercase ${
                    selectedCar.is_sold 
                      ? 'bg-red-100 text-red-700 border border-red-300' 
                      : 'bg-green-100 text-green-700 border border-green-300'
                  }`}>
                    {selectedCar.is_sold ? '🔴 Vendu' : '✅ Disponible'}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={closeDetails}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
