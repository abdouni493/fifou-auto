import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { supabase } from '../supabase';

interface Receipt {
  id: string;
  name: string;
  receipt_date: string;
  note?: string;
  created_at: string;
  created_by?: string;
}

interface ReceiptsProps {
  lang: Language;
  showroom?: any;
  userId?: string;
}

export const Receipts: React.FC<ReceiptsProps> = ({ lang, showroom, userId }) => {
  const t = translations[lang];
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Receipt | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (editingRecord) {
        const { error } = await supabase
          .from('receipts')
          .update({
            name: data.name,
            receipt_date: data.receipt_date,
            note: data.note || null
          })
          .eq('id', editingRecord.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('receipts')
          .insert({
            name: data.name,
            receipt_date: data.receipt_date,
            note: data.note || null,
            created_by: userId || 'system'
          });

        if (error) throw error;
      }

      setShowForm(false);
      setEditingRecord(null);
      await fetchReceipts();
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Error saving receipt');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce reçu ?')) return;

    try {
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) throw error;
      await fetchReceipts();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Error deleting receipt');
    }
  };

  const handlePrint = (receipt: Receipt) => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: white; }
          .receipt-container { width: 100%; max-width: 800px; margin: 0 auto; background: white; padding: 40px; }
          .header { display: flex; align-items: center; gap: 30px; margin-bottom: 40px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .logo { width: 100px; height: 100px; }
          .logo img { width: 100%; height: 100%; object-fit: contain; }
          .header-info h1 { font-size: 32px; font-weight: bold; color: #1f2937; margin: 0; }
          .header-info p { font-size: 14px; color: #666; margin: 5px 0 0 0; }
          .title { font-size: 14px; color: #999; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
          .document-id { font-size: 16px; font-weight: bold; color: #1f2937; margin: 8px 0 0 0; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 15px; }
          .info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 10px; border-bottom: 1px solid #f3f4f6; }
          .info-label { font-size: 13px; color: #666; font-weight: 600; }
          .info-value { font-size: 14px; color: #1f2937; font-weight: bold; }
          .note { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
          .note-label { font-size: 12px; color: #999; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
          .note-content { font-size: 13px; color: #1f2937; line-height: 1.5; }
          .signature-section { display: flex; gap: 60px; margin-top: 60px; }
          .signature-box { flex: 1; }
          .signature-label { font-size: 12px; color: #999; font-weight: bold; text-transform: uppercase; margin-bottom: 40px; }
          .signature-line { border-top: 1px solid #1f2937; padding-top: 5px; font-size: 12px; color: #1f2937; font-weight: bold; }
          .cachet-box { flex: 1; text-align: center; }
          .cachet-label { font-size: 12px; color: #999; font-weight: bold; text-transform: uppercase; margin-bottom: 40px; }
          .cachet-space { width: 120px; height: 80px; border: 2px dashed #d1d5db; border-radius: 8px; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #d1d5db; font-size: 12px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #999; }
        </style>
      </head>
      <body>
        <div class="receipt-container" id="receipt-print">
          <div class="header">
            ${showroom?.logo_data ? `
              <div class="logo">
                <img src="${showroom.logo_data}" alt="Logo" />
              </div>
            ` : ''}
            <div class="header-info">
              <h1>${showroom?.name || 'SHOWROOM'}</h1>
              <p>${showroom?.slogan || ''}</p>
            </div>
            <div style="margin-left: auto; text-align: right;">
              <p class="title">REÇU</p>
              <p class="document-id">#${receipt.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📋 Informations Reçu</div>
            <div class="info-row">
              <span class="info-label">Nom:</span>
              <span class="info-value">${receipt.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${new Date(receipt.receipt_date).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          ${receipt.note ? `
            <div class="note">
              <div class="note-label">📝 Note</div>
              <div class="note-content">${receipt.note}</div>
            </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-label">Signature</div>
              <div class="signature-line"></div>
            </div>
            <div class="cachet-box">
              <div class="cachet-label">Cachet/Sceau</div>
              <div class="cachet-space">Cachet</div>
            </div>
          </div>

          <div class="footer">
            <p>Reçu généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            <p>${showroom?.address || ''}</p>
          </div>
        </div>

        <script>
          // Inject print styles
          const style = document.createElement('style');
          style.innerHTML = \`
            @media print {
              body > * { display: none !important; }
              #receipt-print { display: block !important; }
            }
          \`;
          document.head.appendChild(style);

          // Print after a short delay
          setTimeout(() => {
            window.print();
            window.close();
          }, 100);
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative min-h-screen">
      {/* Premium background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-slate-950 to-black pointer-events-none -z-20"></div>
      
      {/* Ambient background blobs */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-red-800 rounded-full blur-[150px] opacity-[0.08] animate-blob pointer-events-none -z-10"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-red-700 rounded-full blur-[140px] opacity-[0.07] animate-blob pointer-events-none -z-10" style={{ animationDelay: '2s' }}></div>
      
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(220,38,38,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none -z-10"></div>

      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-red-950 via-slate-900 to-black rounded-[3rem] p-10 md:p-16 text-white shadow-[0_0_80px_rgba(220,38,38,0.3)] overflow-hidden relative border border-red-600/40">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(220,38,38,0.1)_0%,transparent_50%)]"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 via-red-400 to-red-600 tracking-tight mb-3">
              📄 Reçus
            </h1>
            <p className="text-red-400/80 font-black text-sm uppercase tracking-[0.2em]">
              Gestion et Impression des Reçus • {receipts.length} Document{receipts.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button 
            onClick={() => { setEditingRecord(null); setShowForm(true); }} 
            className="group relative px-10 py-5 rounded-2xl overflow-hidden font-black uppercase tracking-widest text-xs transition-all duration-300 active:scale-95 shadow-xl"
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            
            {/* Dynamic shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            
            {/* Enhanced glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-700 via-red-500 to-red-700 rounded-2xl blur-lg opacity-0 group-hover:opacity-80 transition-opacity duration-300 -z-10 group-hover:animate-pulse"></div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center justify-center gap-3 text-white">
              <span className="transition-all duration-300 group-hover:scale-125 group-hover:animate-bounce">➕</span>
              <span className="transition-all duration-300 group-hover:tracking-[0.2em]">Créer un Reçu</span>
            </div>
          </button>
        </div>
      </div>

      {/* Receipts Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="h-16 w-16 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
          <p className="mt-6 font-bold text-red-400/60 uppercase tracking-widest text-xs">Chargement des reçus...</p>
        </div>
      ) : receipts.length === 0 ? (
        <div className="glass-card rounded-[3rem] p-24 text-center border border-red-600/30 bg-gradient-to-b from-red-600/5 to-transparent">
          <div className="text-8xl mb-6 opacity-40 animate-bounce">📭</div>
          <p className="text-red-400/70 font-black text-xl uppercase tracking-[0.2em]">Aucun Reçu Trouvé</p>
          <p className="text-red-500/40 font-bold text-xs mt-4 uppercase tracking-widest">Commencez par créer votre premier document</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {receipts.map((receipt, idx) => (
            <div
              key={receipt.id}
              className="glass-card rounded-[2.5rem] border border-red-600/40 p-8 shadow-xl shadow-red-600/5 hover:shadow-2xl hover:shadow-red-600/20 hover:scale-105 hover:-translate-y-2 transition-all duration-500 flex flex-col group h-full relative overflow-hidden"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 mb-8">
                <h3 className="text-2xl font-black text-red-100 leading-tight tracking-tight group-hover:text-red-400 transition-colors">
                  {receipt.name}
                </h3>
                {receipt.created_by && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] bg-red-600/20 text-red-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-red-600/20">
                      👤 {receipt.created_by}
                    </span>
                  </div>
                )}
              </div>

              <div className="relative z-10 space-y-6 mb-10">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-[1.2rem] bg-red-600/10 border border-red-600/20 flex items-center justify-center flex-shrink-0 text-2xl group-hover:scale-110 transition-transform shadow-inner">📅</div>
                  <div>
                    <p className="text-[10px] font-black text-red-500/50 uppercase tracking-widest">Date d'émission</p>
                    <p className="text-lg font-black text-red-200">{new Date(receipt.receipt_date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                {receipt.note && (
                  <div className="flex items-start gap-5">
                    <div className="h-14 w-14 rounded-[1.2rem] bg-amber-600/10 border border-amber-600/20 flex items-center justify-center flex-shrink-0 text-2xl group-hover:scale-110 transition-transform shadow-inner mt-1">📝</div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-amber-500/50 uppercase tracking-widest">Observations</p>
                      <p className="text-sm font-bold text-red-300/60 line-clamp-2 leading-relaxed italic">"{receipt.note}"</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative z-10 flex gap-3 mt-auto pt-6 border-t border-red-600/10 flex-wrap">
                <button 
                  onClick={() => {
                    setEditingRecord(receipt);
                    setShowForm(true);
                  }}
                  className="flex-1 min-w-[100px] relative group/btn overflow-hidden py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-lg active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 flex items-center justify-center gap-2 text-white">
                    <span className="transition-all duration-300 group-hover/btn:scale-125">✏️</span>
                    <span>Modifier</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => handlePrint(receipt)}
                  className="flex-1 min-w-[100px] relative group/btn overflow-hidden py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-lg active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 flex items-center justify-center gap-2 text-white">
                    <span className="transition-all duration-300 group-hover/btn:scale-125">🖨️</span>
                    <span>Imprimer</span>
                  </div>
                </button>

                <button 
                  onClick={() => handleDelete(receipt.id)}
                  className="h-12 w-12 relative group/btn overflow-hidden rounded-xl font-black flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover/btn:from-red-700 group-hover/btn:via-red-500 group-hover/btn:to-red-700"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="relative z-10 text-lg transition-all duration-300 group-hover/btn:scale-125 text-white">🗑️</div>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ReceiptForm 
          lang={lang}
          onClose={() => {
            setShowForm(false);
            setEditingRecord(null);
          }}
          onSubmit={handleSave}
          initialData={editingRecord}
        />
      )}
    </div>
  );
};

// --- RECEIPT FORM MODAL COMPONENT ---

const ReceiptForm: React.FC<{ lang: Language; onClose: () => void; onSubmit: (data: any) => void; initialData: Receipt | null }> = ({ lang, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    receipt_date: initialData?.receipt_date || new Date().toISOString().split('T')[0],
    note: initialData?.note || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass-card w-full max-w-2xl h-full max-h-[85vh] overflow-hidden rounded-[3rem] shadow-2xl shadow-red-600/40 border border-red-600/40 flex flex-col animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 md:px-10 py-8 flex items-center justify-between bg-gradient-to-r from-red-950/90 to-slate-900/90 border-b border-red-600/40 shrink-0 sticky top-0">
          <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-[1.5rem] bg-red-600/30 text-red-300 flex items-center justify-center text-3xl border border-red-600/40 shadow-lg">📄</div>
            <div>
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-red-500">{initialData ? "Modifier le Reçu" : "Nouveau Document"}</h2>
              <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.2em] mt-1 italic">Émission de Document Officiel</p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 relative group overflow-hidden rounded-full font-black flex items-center justify-center text-lg transition-all duration-300 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="relative z-10 text-white">✕</div>
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar px-6 md:px-10 py-10 space-y-10">
          <Section title="Informations Principales" icon="✍️">
             <div className="space-y-8 pt-4">
                <Field 
                  label="Désignation du Reçu" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="ex: Versement initial commande #44" 
                  emoji="🏷️" 
                />
                <Field 
                  label="Date de l'opération" 
                  name="receipt_date" 
                  type="date"
                  value={formData.receipt_date} 
                  onChange={handleChange} 
                  emoji="📅" 
                />
             </div>
          </Section>

          <Section title="Notes Additionnelles" icon="📝">
             <div className="pt-4">
                <TextAreaField 
                  label="Observations particulières" 
                  name="note" 
                  value={formData.note} 
                  onChange={handleChange} 
                  placeholder="Saisissez ici toute note ou détail important relatif à ce document..." 
                  emoji="ℹ️"
                  minHeight="140px"
                />
             </div>
          </Section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 md:px-10 py-8 bg-gradient-to-r from-red-950/50 to-slate-900/50 border-t border-red-600/40 flex items-center justify-center gap-6 shrink-0 flex-wrap">
          <button 
            onClick={onClose} 
            className="px-10 py-4 bg-slate-900/50 border border-red-600/40 text-red-400 font-black rounded-2xl hover:bg-slate-900/70 transition-all uppercase tracking-widest text-xs"
          >
            Annuler
          </button>
          
          <button 
            onClick={() => {
              if (!formData.name || !formData.receipt_date) {
                alert('Veuillez remplir les champs obligatoires');
                return;
              }
              onSubmit(formData);
            }} 
            className="relative group overflow-hidden px-16 py-4 font-black rounded-2xl transition-all duration-300 uppercase tracking-widest text-xs shadow-xl active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-800 via-red-600 to-red-800 transition-all duration-300 group-hover:from-red-700 group-hover:via-red-500 group-hover:to-red-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 animate-pulse" style={{ animationDuration: '2s' }}></div>
            <div className="relative z-10 flex items-center justify-center gap-3 text-white">
              <span className="transition-all duration-300 group-hover:scale-125">✅</span>
              <span className="transition-all duration-300 group-hover:tracking-[0.2em]">{initialData ? "Mettre à jour" : "Confirmer la création"}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENTS ---

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-red-600/5 rounded-[2.5rem] p-8 space-y-6 border border-red-600/20 shadow-inner group">
     <div className="flex items-center gap-5">
        <div className="h-12 w-12 rounded-xl bg-red-600/20 text-red-300 flex items-center justify-center text-xl border border-red-600/30 group-hover:scale-110 transition-transform">{icon}</div>
        <h4 className="text-xl font-black text-red-100 tracking-tight">{title}</h4>
     </div>
     <div className="relative">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; name: string; value: any; onChange: any; type?: string; placeholder?: string; emoji?: string }> = ({ label, name, value, onChange, type = 'text', placeholder, emoji }) => (
  <div className="space-y-3">
     <label className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
       {emoji && <span>{emoji}</span>} {label}
     </label>
     <input 
       type={type} 
       name={name} 
       value={value ?? ''} 
       onChange={onChange} 
       placeholder={placeholder}
       className="w-full bg-slate-950/50 border-2 border-red-600/20 px-8 py-5 rounded-2xl outline-none focus:border-red-600/60 focus:ring-2 focus:ring-red-600/10 font-bold text-red-100 shadow-sm transition-all text-lg placeholder-red-400/20" 
     />
  </div>
);

const TextAreaField: React.FC<{ label: string; name: string; value: any; onChange: any; placeholder?: string; emoji?: string; minHeight?: string }> = ({ label, name, value, onChange, placeholder, emoji, minHeight = '100px' }) => (
  <div className="space-y-3">
     <label className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.2em] ml-4 flex items-center gap-2">
       {emoji && <span>{emoji}</span>} {label}
     </label>
     <textarea 
       name={name} 
       value={value ?? ''} 
       onChange={onChange} 
       placeholder={placeholder}
       style={{ minHeight }}
       className="w-full bg-slate-950/50 border-2 border-red-600/20 px-8 py-5 rounded-2xl outline-none focus:border-red-600/60 focus:ring-2 focus:ring-red-600/10 font-bold text-red-100 shadow-sm transition-all text-lg resize-none placeholder-red-400/20" 
     />
  </div>
);


