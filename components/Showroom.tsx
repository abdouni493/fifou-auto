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
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'sold'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-high' | 'price-low' | 'year'>('newest');

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

  // Filter and sort logic
  let filteredInventory = inventory.filter(car => {
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'available' && !car.is_sold) || 
      (filterStatus === 'sold' && car.is_sold);
    
    const matchesSearch = 
      car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.color?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Sort
  filteredInventory = [...filteredInventory].sort((a, b) => {
    switch(sortBy) {
      case 'price-high':
        return (b.sellingPrice || 0) - (a.sellingPrice || 0);
      case 'price-low':
        return (a.sellingPrice || 0) - (b.sellingPrice || 0);
      case 'year':
        return (b.year || 0) - (a.year || 0);
      case 'newest':
      default:
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="h-16 w-16 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
        <p className="mt-6 font-bold text-red-400/60 uppercase tracking-widest text-xs">Chargement Showroom...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-3">
              🚗 {t.menu.showroom}
            </h1>
            <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">
              {filteredInventory.length} Véhicule{filteredInventory.length !== 1 ? 's' : ''} Disponible{filteredInventory.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button 
            onClick={onNavigateToPurchase} 
            className="group relative px-8 py-4 rounded-[2rem] bg-gradient-to-r from-red-600 to-red-700 text-white font-black uppercase tracking-wider hover:shadow-2xl hover:shadow-red-600/50 hover:scale-110 transition-all duration-300 border border-red-500/50"
          >
            <span className="relative z-10 flex items-center gap-3">
              ➕ Ajouter Véhicule
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-800 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="space-y-4">
        {/* Search Box */}
        <div className="relative group">
          <input
            type="text"
            placeholder="🔍 Rechercher par marque, modèle, couleur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-4 rounded-[2rem] border border-red-600/40 bg-slate-900/50 text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-600 transition-all backdrop-blur-sm font-black"
          />
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-red-600/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-6 py-3 rounded-[1.5rem] font-black text-sm uppercase tracking-wider transition-all border ${
              filterStatus === 'all'
                ? 'bg-red-600/30 text-red-300 border-red-600/60 shadow-lg shadow-red-600/20'
                : 'bg-slate-900/50 text-red-400/70 border-red-600/30 hover:border-red-600/50 hover:bg-slate-900/70'
            }`}
          >
            📋 Tous ({inventory.length})
          </button>
          <button
            onClick={() => setFilterStatus('available')}
            className={`px-6 py-3 rounded-[1.5rem] font-black text-sm uppercase tracking-wider transition-all border ${
              filterStatus === 'available'
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-600/60 shadow-lg shadow-emerald-600/20'
                : 'bg-slate-900/50 text-emerald-400/70 border-emerald-600/30 hover:border-emerald-600/50 hover:bg-slate-900/70'
            }`}
          >
            ✅ Disponibles ({inventory.filter(c => !c.is_sold).length})
          </button>
          <button
            onClick={() => setFilterStatus('sold')}
            className={`px-6 py-3 rounded-[1.5rem] font-black text-sm uppercase tracking-wider transition-all border ${
              filterStatus === 'sold'
                ? 'bg-rose-600/30 text-rose-300 border-rose-600/60 shadow-lg shadow-rose-600/20'
                : 'bg-slate-900/50 text-rose-400/70 border-rose-600/30 hover:border-rose-600/50 hover:bg-slate-900/70'
            }`}
          >
            🔴 Vendus ({inventory.filter(c => c.is_sold).length})
          </button>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-6 py-3 rounded-[1.5rem] font-black text-sm border border-red-600/40 bg-slate-900/50 text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 uppercase tracking-wider transition-all"
          >
            <option value="newest">🕐 Plus Récent</option>
            <option value="price-high">💰 Prix: Plus Cher</option>
            <option value="price-low">💵 Prix: Plus Pas Cher</option>
            <option value="year">📅 Année: Plus Récent</option>
          </select>
        </div>
      </div>

      {/* CARS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((car, idx) => (
          <div 
            key={car.id} 
            className="glass-card rounded-[2.5rem] overflow-hidden border border-red-600/40 shadow-xl shadow-red-600/10 hover:shadow-2xl hover:shadow-red-600/20 hover:scale-105 hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group relative"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className={`px-4 py-2 rounded-full text-xs font-black uppercase backdrop-blur-sm border font-black ${
                car.is_sold 
                  ? 'bg-rose-600/30 text-rose-300 border-rose-600/60' 
                  : 'bg-emerald-600/30 text-emerald-300 border-emerald-600/60'
              }`}>
                {car.is_sold ? '🔴 Vendu' : '✅ Disponible'}
              </span>
            </div>

            {/* Image Container */}
            <div className="h-48 overflow-hidden relative bg-gradient-to-br from-red-900/50 to-black">
              <img 
                src={car.photo_urls?.[0] || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=500'} 
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              {car.photo_urls && car.photo_urls.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-red-600/30">
                  <span className="text-xs font-black text-red-400">📸 +{car.photo_urls.length - 1}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col flex-grow space-y-4">
              {/* Make & Model */}
              <div>
                <h3 className="text-2xl font-black text-red-100 leading-tight">{car.make}</h3>
                <p className="text-sm font-black text-red-400/70">{car.model}</p>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-red-600/20 px-3 py-2 rounded-lg border border-red-600/30">
                  <p className="text-red-400/70 font-black uppercase">Année</p>
                  <p className="font-black text-red-200 mt-0.5">{car.year}</p>
                </div>
                <div className="bg-red-600/20 px-3 py-2 rounded-lg border border-red-600/30">
                  <p className="text-red-400/70 font-black uppercase">Couleur</p>
                  <p className="font-black text-red-200 mt-0.5">{car.color}</p>
                </div>
                <div className="bg-blue-600/20 px-3 py-2 rounded-lg border border-blue-600/30">
                  <p className="text-blue-400/70 font-black uppercase">Km</p>
                  <p className="font-black text-blue-200 mt-0.5">{(car.mileage || 0).toLocaleString()}</p>
                </div>
                <div className="bg-amber-600/20 px-3 py-2 rounded-lg border border-amber-600/30">
                  <p className="text-amber-400/70 font-black uppercase">Carburant</p>
                  <p className="font-black text-amber-200 mt-0.5">{car.fuel === 'essence' ? '⛽' : '🛢️'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-4 border-t border-red-600/20">
                <button 
                  onClick={() => openDetails(car)} 
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs uppercase hover:shadow-lg hover:shadow-red-600/30 hover:scale-105 transition-all border border-red-500/50"
                >
                  👁️ Voir Détails
                </button>
                {!car.is_sold && (
                  <button 
                    onClick={() => onEdit(car)} 
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-xs uppercase hover:shadow-lg hover:shadow-amber-600/30 hover:scale-105 transition-all border border-amber-500/50"
                  >
                    ✏️ Modifier
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredInventory.length === 0 && (
        <div className="glass-card rounded-[2.5rem] p-16 text-center border border-red-600/30">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-red-200 font-black text-lg">Aucun véhicule trouvé</p>
          <p className="text-red-400/70 text-sm mt-2">Essayez de modifier vos filtres ou ajoutez un nouveau véhicule</p>
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedCar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-card rounded-[3rem] max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl shadow-red-600/40 border border-red-600/40 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-950/90 to-slate-900/90 border-b border-red-600/40 p-6 md:p-8 flex justify-between items-start backdrop-blur-sm">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500">
                  {selectedCar.make} {selectedCar.model}
                </h2>
                <p className="text-sm text-red-400/70 font-black mt-2 uppercase tracking-wider">{selectedCar.year} • {selectedCar.color}</p>
              </div>
              <button 
                onClick={closeDetails} 
                className="h-10 w-10 rounded-full bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 flex items-center justify-center text-xl font-black transition-all border border-red-600/30 flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* Images */}
              {selectedCar.photo_urls && selectedCar.photo_urls.length > 0 && (
                <div>
                  <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500 mb-4">📸 Galerie Photos</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedCar.photo_urls.map((photo, idx) => (
                      <img 
                        key={idx} 
                        src={photo} 
                        alt={`Photo ${idx + 1}`} 
                        className="w-full h-32 object-cover rounded-[1.5rem] border border-red-600/40 hover:scale-110 transition-transform hover:shadow-lg hover:shadow-red-600/20"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle Specifications */}
              <div>
                <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500 mb-4">🚗 Spécifications Véhicule</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailBox label="VIN" value={selectedCar.vin || 'N/A'} />
                  <DetailBox label="Immatriculation" value={selectedCar.plate || 'N/A'} />
                  <DetailBox label="Kilométrage" value={`${(selectedCar.mileage || 0).toLocaleString()} km`} />
                  <DetailBox label="Carburant" value={selectedCar.fuel === 'essence' ? '⛽ Essence' : '🛢️ Diesel'} />
                  <DetailBox label="Transmission" value={selectedCar.transmission === 'manuelle' ? 'Manuelle' : 'Automatique'} />
                  <DetailBox label="Portes" value={`${selectedCar.doors || 'N/A'}`} />
                  <DetailBox label="Sièges" value={`${selectedCar.seats || 'N/A'}`} />
                  <DetailBox label="État" value={selectedCar.condition || 'N/A'} />
                  <DetailBox label="Couleur" value={selectedCar.color || 'N/A'} />
                </div>
              </div>

              {/* Insurance & Maintenance */}
              <div>
                <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 mb-4">🛡️ Assurance & Maintenance</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailBox label="Compagnie Assurance" value={selectedCar.insuranceCompany || 'N/A'} />
                  <DetailBox label="Expiration Assurance" value={selectedCar.insuranceExpiry ? new Date(selectedCar.insuranceExpiry).toLocaleDateString('fr-FR') : 'N/A'} />
                  <DetailBox label="Contrôle Technique" value={selectedCar.techControlDate ? new Date(selectedCar.techControlDate).toLocaleDateString('fr-FR') : 'N/A'} />
                </div>
              </div>

              {/* Purchase Information */}
              <div>
                <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500 mb-4">🏢 Informations d'Achat</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailBox label="Fournisseur" value={selectedCar.supplierName || 'N/A'} color="blue" />
                  <DetailBox label="Coût d'Achat" value={`${(selectedCar.totalCost || 0).toLocaleString()} DA`} color="blue" />
                  <DetailBox label="Prix de Vente" value={`${(selectedCar.sellingPrice || 0).toLocaleString()} DA`} color="blue" />
                  <DetailBox label="Date d'Achat" value={selectedCar.created_at ? new Date(selectedCar.created_at).toLocaleDateString('fr-FR') : 'N/A'} color="blue" />
                  <DetailBox label="Ajouté par" value={selectedCar.created_by || 'N/A'} color="blue" />
                  {selectedCar.clientName && <DetailBox label="Client Initial" value={selectedCar.clientName || 'N/A'} color="blue" />}
                </div>
              </div>

              {/* Description */}
              {selectedCar.description && (
                <div>
                  <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500 mb-4">📝 Notes et Description</h3>
                  <p className="text-red-200/80 leading-relaxed bg-red-600/10 p-4 rounded-[1.5rem] border border-red-600/30">
                    {selectedCar.description}
                  </p>
                </div>
              )}

              {/* Sale Information - Only if Sold */}
              {selectedCar.is_sold && saleDetails && (
                <>
                  <div className="border-t border-red-600/30 pt-6">
                    <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-rose-500 mb-4">📋 Détails de la Vente</h3>
                    
                    {/* Buyer Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-black text-rose-300 mb-3 uppercase tracking-wider">👤 Informations Acheteur</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <DetailBox label="Prénom" value={saleDetails.first_name || 'N/A'} color="rose" />
                        <DetailBox label="Nom" value={saleDetails.last_name || 'N/A'} color="rose" />
                        <DetailBox label="Date de Naissance" value={saleDetails.dob ? new Date(saleDetails.dob).toLocaleDateString('fr-FR') : 'N/A'} color="rose" />
                        <DetailBox label="Genre" value={saleDetails.gender === 'M' ? 'Homme' : saleDetails.gender === 'F' ? 'Femme' : 'N/A'} color="rose" />
                        <DetailBox label="Profession" value={saleDetails.profession || 'N/A'} color="rose" />
                        <DetailBox label="Lieu de Naissance" value={saleDetails.pob || 'N/A'} color="rose" />
                        <DetailBox label="Téléphone 1" value={saleDetails.mobile1 || 'N/A'} color="rose" />
                        {saleDetails.mobile2 && <DetailBox label="Téléphone 2" value={saleDetails.mobile2} color="rose" />}
                        <DetailBox label="Adresse" value={saleDetails.address || 'N/A'} color="rose" />
                      </div>
                    </div>

                    {/* Document Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-black text-rose-300 mb-3 uppercase tracking-wider">📄 Documents</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <DetailBox label="Type Document" value={saleDetails.doc_type || 'N/A'} color="rose" />
                        <DetailBox label="Numéro Document" value={saleDetails.doc_number || 'N/A'} color="rose" />
                        <DetailBox label="Date d'Émission" value={saleDetails.issue_date ? new Date(saleDetails.issue_date).toLocaleDateString('fr-FR') : 'N/A'} color="rose" />
                        <DetailBox label="Date d'Expiration" value={saleDetails.expiry_date ? new Date(saleDetails.expiry_date).toLocaleDateString('fr-FR') : 'N/A'} color="rose" />
                        <DetailBox label="NIF" value={saleDetails.nif || 'N/A'} color="rose" />
                        <DetailBox label="RC" value={saleDetails.rc || 'N/A'} color="rose" />
                        <DetailBox label="NIS" value={saleDetails.nis || 'N/A'} color="rose" />
                        <DetailBox label="ART" value={saleDetails.art || 'N/A'} color="rose" />
                      </div>
                    </div>

                    {/* Sale Financial Details */}
                    <div>
                      <h4 className="text-sm font-black text-rose-300 mb-3 uppercase tracking-wider">💰 Détails Financiers de Vente</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <DetailBox label="Prix Final" value={`${(saleDetails.total_price || 0).toLocaleString()} DA`} color="rose" />
                        <DetailBox label="Montant Payé" value={`${(saleDetails.amount_paid || 0).toLocaleString()} DA`} color="rose" />
                        <DetailBox label="Balance" value={`${(saleDetails.balance || 0).toLocaleString()} DA`} color="rose" />
                        <DetailBox label="Statut" value={saleDetails.status === 'completed' ? '✅ Complétée' : '⚠️ Dette'} color="rose" />
                        <DetailBox label="Date de Vente" value={saleDetails.created_at ? new Date(saleDetails.created_at).toLocaleDateString('fr-FR') : 'N/A'} color="rose" />
                        <DetailBox label="Vendu par" value={saleDetails.created_by || 'N/A'} color="rose" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 border-t border-red-600/40 bg-gradient-to-r from-black/50 to-slate-950/50 flex gap-3 flex-wrap">
              <button 
                onClick={closeDetails}
                className="flex-1 min-w-[140px] py-3 bg-slate-900/50 border border-red-600/40 text-red-400 font-black rounded-[1.5rem] hover:bg-slate-900/70 transition-all uppercase tracking-wider text-sm"
              >
                Fermer
              </button>
              {!selectedCar.is_sold && (
                <button 
                  onClick={() => {
                    onEdit(selectedCar);
                    closeDetails();
                  }}
                  className="flex-1 min-w-[140px] py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black rounded-[1.5rem] hover:shadow-lg hover:shadow-amber-600/30 transition-all uppercase tracking-wider text-sm border border-amber-500/50"
                >
                  ✏️ Modifier
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailBox = ({ label, value, color = 'red' }: { label: string; value: string; color?: string }) => {
  const colorMap = {
    red: { bg: 'bg-red-600/20', border: 'border-red-600/30', label: 'text-red-400/70', value: 'text-red-200' },
    blue: { bg: 'bg-blue-600/20', border: 'border-blue-600/30', label: 'text-blue-400/70', value: 'text-blue-200' },
    rose: { bg: 'bg-rose-600/20', border: 'border-rose-600/30', label: 'text-rose-400/70', value: 'text-rose-200' }
  };
  
  const colors = colorMap[color as keyof typeof colorMap] || colorMap.red;

  return (
    <div className={`${colors.bg} ${colors.border} p-4 rounded-[1.5rem] border`}>
      <p className={`text-xs font-black ${colors.label} uppercase tracking-wider`}>{label}</p>
      <p className={`font-black ${colors.value} mt-2 break-words`}>{value}</p>
    </div>
  );
};
