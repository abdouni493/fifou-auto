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

  const calculateGain = (car: PurchaseRecord, saleRecord?: SaleWithDetails | null) => {
    if (saleRecord) {
      return saleRecord.total_price - car.totalCost;
    }
    return car.sellingPrice - car.totalCost;
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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-slate-600 uppercase tracking-widest text-xs">Loading Showroom...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-5xl font-black text-slate-900 mb-2">{t.menu.showroom}</h2>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-wide">
            🚗 {filteredInventory.length} véhicule{filteredInventory.length !== 1 ? 's' : ''} disponible{filteredInventory.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button 
          onClick={onNavigateToPurchase} 
          className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black px-8 py-4 rounded-2xl hover:shadow-lg hover:scale-105 transition-all duration-300"
        >
          ➕ Ajouter Véhicule
        </button>
      </div>

      {/* Filters & Search */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Rechercher par marque, modèle, couleur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Status Filter */}
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-5 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${
              filterStatus === 'all'
                ? 'bg-indigo-100 text-indigo-600 border border-indigo-300'
                : 'bg-white text-slate-600 border border-slate-300 hover:border-slate-400'
            }`}
          >
            📋 Tous ({inventory.length})
          </button>
          <button
            onClick={() => setFilterStatus('available')}
            className={`px-5 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${
              filterStatus === 'available'
                ? 'bg-emerald-100 text-emerald-600 border border-emerald-300'
                : 'bg-white text-slate-600 border border-slate-300 hover:border-slate-400'
            }`}
          >
            ✅ Disponibles ({inventory.filter(c => !c.is_sold).length})
          </button>
          <button
            onClick={() => setFilterStatus('sold')}
            className={`px-5 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition-all ${
              filterStatus === 'sold'
                ? 'bg-red-100 text-red-600 border border-red-300'
                : 'bg-white text-slate-600 border border-slate-300 hover:border-slate-400'
            }`}
          >
            🔴 Vendus ({inventory.filter(c => c.is_sold).length})
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-5 py-3 rounded-xl font-black text-sm border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase tracking-wide transition-all"
          >
            <option value="newest">🕐 Plus Récent</option>
            <option value="price-high">💰 Prix: Plus Cher</option>
            <option value="price-low">💵 Prix: Plus Pas Cher</option>
            <option value="year">📅 Année: Plus Récent</option>
          </select>
        </div>
      </div>

      {/* Cars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredInventory.map((car, idx) => (
          <div 
            key={car.id} 
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col h-full overflow-hidden relative group animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Status Badge */}
            <div className="absolute top-4 right-4 z-10">
              <span className={`px-4 py-2 rounded-full text-xs font-black uppercase backdrop-blur-sm border ${
                car.is_sold 
                  ? 'bg-red-50 text-red-600 border-red-300' 
                  : 'bg-emerald-50 text-emerald-600 border-emerald-300'
              }`}>
                {car.is_sold ? '🔴 Vendu' : '✅ Disponible'}
              </span>
            </div>

            {/* Image Container */}
            <div className="h-40 overflow-hidden relative bg-slate-100">
              <img 
                src={car.photo_urls?.[0] || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=500'} 
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {car.photo_urls && car.photo_urls.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                  <span className="text-xs font-black text-white">📸 +{car.photo_urls.length - 1}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
              {/* Make & Model */}
              <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">{car.make}</h3>
              <p className="text-sm font-bold text-slate-600 mb-3">{car.model}</p>

              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-[11px]">
                <div className="bg-slate-50 px-2 py-1.5 rounded-lg">
                  <p className="text-slate-500 font-bold uppercase">Année</p>
                  <p className="font-black text-slate-900">{car.year}</p>
                </div>
                <div className="bg-slate-50 px-2 py-1.5 rounded-lg">
                  <p className="text-slate-500 font-bold uppercase">Couleur</p>
                  <p className="font-black text-slate-900">{car.color}</p>
                </div>
                <div className="bg-slate-50 px-2 py-1.5 rounded-lg">
                  <p className="text-slate-500 font-bold uppercase">Km</p>
                  <p className="font-black text-slate-900">{(car.mileage || 0).toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 px-2 py-1.5 rounded-lg">
                  <p className="text-slate-500 font-bold uppercase">Carburant</p>
                  <p className="font-black text-slate-900">{car.fuel === 'essence' ? '⛽' : '🛢️'}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <p className="text-xs font-bold text-indigo-600 uppercase">Prix de Vente</p>
                <p className="text-lg font-black text-indigo-600">{(car.sellingPrice || 0).toLocaleString()} {t.currency}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <button 
                  onClick={() => openDetails(car)} 
                  className="flex-1 py-3 rounded-lg bg-indigo-100 text-indigo-600 font-black text-xs uppercase hover:bg-indigo-200 transition-all"
                >
                  👁️ Voir Détails
                </button>
                {!car.is_sold && (
                  <button 
                    onClick={() => onEdit(car)} 
                    className="flex-1 py-3 rounded-lg bg-slate-900 text-white font-black text-xs uppercase hover:bg-slate-800 transition-all"
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
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-slate-500 font-black text-lg">Aucun véhicule trouvé</p>
          <p className="text-slate-400 text-sm mt-2">Essayez de modifier vos filtres</p>
        </div>
      )}

      {/* Details Modal */}
      {selectedCar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  {selectedCar.make} {selectedCar.model}
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">{selectedCar.year} • {selectedCar.color}</p>
              </div>
              <button 
                onClick={closeDetails} 
                className="h-10 w-10 rounded-full bg-white hover:bg-red-100 text-slate-400 hover:text-red-600 flex items-center justify-center text-xl font-black transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Images */}
              {selectedCar.photo_urls && selectedCar.photo_urls.length > 0 && (
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-4">📸 Photos</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedCar.photo_urls.map((photo, idx) => (
                      <img 
                        key={idx} 
                        src={photo} 
                        alt={`Photo ${idx + 1}`} 
                        className="w-full h-32 object-cover rounded-xl border border-slate-200 hover:scale-105 transition-transform"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle Details */}
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">🚗 Informations Véhicule</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-black text-slate-500 uppercase">VIN</p>
                    <p className="font-bold text-slate-900 mt-1">{selectedCar.vin || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-black text-slate-500 uppercase">Immatriculation</p>
                    <p className="font-bold text-slate-900 mt-1">{selectedCar.plate || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-black text-slate-500 uppercase">Kilométrage</p>
                    <p className="font-bold text-slate-900 mt-1">{(selectedCar.mileage || 0).toLocaleString()} km</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-black text-slate-500 uppercase">Carburant</p>
                    <p className="font-bold text-slate-900 mt-1">{selectedCar.fuel === 'essence' ? '⛽ Essence' : '🛢️ Diesel'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-black text-slate-500 uppercase">Transmission</p>
                    <p className="font-bold text-slate-900 mt-1">{selectedCar.transmission === 'manuelle' ? 'Manuelle' : 'Automatique'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-black text-slate-500 uppercase">État</p>
                    <p className="font-bold text-slate-900 mt-1">{selectedCar.condition || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">💰 Détails Financiers</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <p className="text-xs font-black text-blue-600 uppercase">Coût d'Achat</p>
                    <p className="font-black text-blue-600 mt-1">{(selectedCar.totalCost || 0).toLocaleString()} {t.currency}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                    <p className="text-xs font-black text-indigo-600 uppercase">Prix de Vente</p>
                    <p className="font-black text-indigo-600 mt-1">{(selectedCar.sellingPrice || 0).toLocaleString()} {t.currency}</p>
                  </div>
                  {selectedCar.is_sold && saleDetails && (
                    <>
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                        <p className="text-xs font-black text-emerald-600 uppercase">Prix Final</p>
                        <p className="font-black text-emerald-600 mt-1">{(saleDetails.total_price || 0).toLocaleString()} {t.currency}</p>
                      </div>
                      <div className={`p-4 rounded-xl border ${calculateGain(selectedCar, saleDetails) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <p className={`text-xs font-black uppercase ${calculateGain(selectedCar, saleDetails) >= 0 ? 'text-green-600' : 'text-red-600'}`}>Gain/Perte</p>
                        <p className={`font-black mt-1 ${calculateGain(selectedCar, saleDetails) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {calculateGain(selectedCar, saleDetails) >= 0 ? '+' : ''}{calculateGain(selectedCar, saleDetails).toLocaleString()} {t.currency}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedCar.description && (
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-4">📝 Description</h3>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {selectedCar.description}
                  </p>
                </div>
              )}

              {/* Sale Info */}
              {selectedCar.is_sold && saleDetails && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <p className="text-sm font-black text-red-600 mb-2">📋 Informations de Vente</p>
                  <p className="text-xs text-red-700">
                    Vendu à: <span className="font-bold">{saleDetails.first_name} {saleDetails.last_name}</span>
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Date: <span className="font-bold">{new Date(saleDetails.created_at || 0).toLocaleDateString('fr-FR')}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
              <button 
                onClick={closeDetails}
                className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-black rounded-xl hover:bg-slate-100 transition-all"
              >
                Fermer
              </button>
              {!selectedCar.is_sold && (
                <button 
                  onClick={() => {
                    onEdit(selectedCar);
                    closeDetails();
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl hover:scale-105 transition-all"
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
