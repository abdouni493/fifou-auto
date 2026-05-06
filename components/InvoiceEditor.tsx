import React, { useState } from 'react';
import { PurchaseRecord, Language } from '../types';
import { translations } from '../translations';

interface InvoiceElement {
  id: string;
  type: 'text' | 'image' | 'section';
  label: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  bold: boolean;
  color: string;
}

interface InvoiceEditorProps {
  purchase: PurchaseRecord;
  lang: Language;
  showroom: any;
  onPrint: (elements: InvoiceElement[]) => void;
  onCancel: () => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  purchase,
  lang,
  showroom,
  onPrint,
  onCancel
}) => {
  const t = translations[lang];
  const [elements, setElements] = useState<InvoiceElement[]>([
    // Logo
    {
      id: 'logo',
      type: 'image',
      label: 'Logo Showroom',
      content: showroom?.logo_url || '',
      x: 20,
      y: 20,
      width: 80,
      height: 80,
      fontSize: 16,
      bold: true,
      color: '#000'
    },
    // Showroom Name
    {
      id: 'showroom_name',
      type: 'text',
      label: 'Nom Showroom',
      content: showroom?.name || 'SHOWROOM',
      x: 120,
      y: 20,
      width: 300,
      height: 40,
      fontSize: 32,
      bold: true,
      color: '#111827'
    },
    // Document Title
    {
      id: 'title',
      type: 'text',
      label: 'Titre Document',
      content: 'FACTURE D\'ACHAT',
      x: 450,
      y: 40,
      width: 150,
      height: 30,
      fontSize: 14,
      bold: true,
      color: '#6b7280'
    },
    // Vehicle Info
    {
      id: 'vehicle_info',
      type: 'section',
      label: 'Info Véhicule',
      content: `${purchase.make} ${purchase.model} - ${purchase.year}\nImmatriculation: ${purchase.plate}`,
      x: 20,
      y: 120,
      width: 560,
      height: 60,
      fontSize: 14,
      bold: false,
      color: '#1f2937'
    },
    // Supplier Info
    {
      id: 'supplier_info',
      type: 'section',
      label: 'Fournisseur',
      content: `Fournisseur: ${purchase.supplierName}`,
      x: 20,
      y: 200,
      width: 560,
      height: 40,
      fontSize: 12,
      bold: false,
      color: '#1f2937'
    },
    // Financial Summary
    {
      id: 'financial_summary',
      type: 'section',
      label: 'Résumé Financier',
      content: `Coût d'Achat: ${purchase.totalCost?.toLocaleString()} ${t.currency}\nPrix Vente: ${purchase.sellingPrice?.toLocaleString()} ${t.currency}`,
      x: 20,
      y: 460,
      width: 560,
      height: 60,
      fontSize: 12,
      bold: false,
      color: '#1f2937'
    }
  ]);

  const [selectedElement, setSelectedElement] = useState<string | null>('showroom_name');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    // Double-click to edit text
    if (e.detail === 2 && element.type === 'text') {
      setEditingElement(elementId);
      setEditText(element.content);
      return;
    }

    setSelectedElement(elementId);
    setDragging(elementId);
    setDragOffset({
      x: e.clientX - element.x,
      y: e.clientY - element.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || editingElement) return;

    setElements(elements.map(el => {
      if (el.id === dragging) {
        return {
          ...el,
          x: Math.max(0, e.clientX - dragOffset.x),
          y: Math.max(0, e.clientY - dragOffset.y)
        };
      }
      return el;
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleFinishEdit = () => {
    if (editingElement) {
      updateElement(editingElement, { content: editText });
      setEditingElement(null);
    }
  };

  const updateElement = (id: string, updates: Partial<InvoiceElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 bg-gray-100 p-4 overflow-auto flex items-center justify-center">
            <div style={{ fontSize: '11px', color: '#9ca3af', position: 'absolute', top: '20px', left: '20px' }}>
              💡 Double-click sur un texte pour l'éditer • Drag pour déplacer
            </div>
            <div
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                width: '600px',
                height: '800px',
                backgroundColor: 'white',
                border: '2px solid #ddd',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {elements.map(element => (
                <div
                  key={element.id}
                  onMouseDown={(e) => handleMouseDown(e, element.id)}
                  onClick={() => !editingElement && setSelectedElement(element.id)}
                  style={{
                    position: 'absolute',
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${element.width}px`,
                    height: `${element.height}px`,
                    cursor: editingElement === element.id ? 'text' : 'move',
                    border: selectedElement === element.id ? '3px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px',
                    backgroundColor: selectedElement === element.id ? '#eff6ff' : 'transparent',
                    overflow: 'hidden'
                  }}
                >
                  {editingElement === element.id && element.type === 'text' ? (
                    <input
                      autoFocus
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={handleFinishEdit}
                      onKeyDown={(e) => e.key === 'Enter' && handleFinishEdit()}
                      style={{
                        width: '100%',
                        height: '100%',
                        fontSize: `${element.fontSize}px`,
                        fontWeight: element.bold ? 'bold' : 'normal',
                        color: element.color,
                        border: 'none',
                        background: 'white',
                        padding: '4px'
                      }}
                    />
                  ) : element.type === 'image' && element.content ? (
                    <img
                      src={element.content}
                      alt={element.label}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: `${element.fontSize}px`,
                        fontWeight: element.bold ? 'bold' : 'normal',
                        color: element.color,
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word'
                      }}
                    >
                      {element.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Properties Panel */}
          <div className="w-80 bg-slate-50 p-6 overflow-y-auto border-l border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-6">Propriétés</h3>

            {selectedElement ? (
              <div className="space-y-6">
                {(() => {
                  const el = elements.find(e => e.id === selectedElement);
                  if (!el) return null;

                  return (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                          Libellé
                        </label>
                        <input
                          type="text"
                          value={el.label}
                          onChange={(e) => updateElement(el.id, { label: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                        />
                      </div>

                      {el.type !== 'image' && (
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Contenu
                          </label>
                          <textarea
                            value={el.content}
                            onChange={(e) => updateElement(el.id, { content: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold h-20"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            X
                          </label>
                          <input
                            type="number"
                            value={el.x}
                            onChange={(e) => updateElement(el.id, { x: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Y
                          </label>
                          <input
                            type="number"
                            value={el.y}
                            onChange={(e) => updateElement(el.id, { y: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Largeur
                          </label>
                          <input
                            type="number"
                            value={el.width}
                            onChange={(e) => updateElement(el.id, { width: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Hauteur
                          </label>
                          <input
                            type="number"
                            value={el.height}
                            onChange={(e) => updateElement(el.id, { height: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                          />
                        </div>
                      </div>

                      {el.type !== 'image' && (
                        <>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                              Taille Texte
                            </label>
                            <input
                              type="number"
                              value={el.fontSize}
                              onChange={(e) => updateElement(el.id, { fontSize: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                              Couleur
                            </label>
                            <input
                              type="color"
                              value={el.color}
                              onChange={(e) => updateElement(el.id, { color: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg h-10"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={el.bold}
                                onChange={(e) => updateElement(el.id, { bold: e.target.checked })}
                              />
                              Gras
                            </label>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-500">Sélectionnez un élément pour modifier</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-4 justify-end">
          <button
            onClick={onCancel}
            className="px-8 py-3 rounded-lg bg-slate-200 text-slate-900 font-black text-sm uppercase tracking-widest hover:bg-slate-300 transition-all"
          >
            ✕ Annuler
          </button>
          <button
            onClick={() => onPrint(elements)}
            className="px-8 py-3 rounded-lg bg-green-500 text-white font-black text-sm uppercase tracking-widest hover:bg-green-600 transition-all"
          >
            🖨️ Imprimer
          </button>
        </div>
      </div>
    </div>
  );
};
