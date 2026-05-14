const fs = require('fs');
let content = fs.readFileSync('c:/Users/Admin/Desktop/showroom-management/components/Billing.tsx', 'utf8');

const OLD = `                 </div>
               ) : (
                 /* INSPECTION DETAILS - FULL CHECKLIST */
                 <div className="space-y-8">`;

const NEW = `                 </div>

                  {/* LINKED INSPECTION CHECKLIST */}
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-3">
                       <span className="h-1.5 w-8 rounded-full bg-slate-300"></span>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspection Check-Out liée</p>
                    </div>
                    {selectedItemForDetails.linkedInspection ? (
                      <div className="space-y-6 bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-sm">
                         <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
                           <span className="text-3xl">📤</span>
                           <div>
                             <p className="font-black text-slate-900 text-lg">{selectedItemForDetails.linkedInspection.car_name}</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(selectedItemForDetails.linkedInspection.mileage||0).toLocaleString()} KM • {selectedItemForDetails.linkedInspection.partner_name}</p>
                           </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <InspectionSection title="Contrôle Sécurité" icon="🛡️" items={selectedItemForDetails.linkedInspection.safety} labels={{ lights: 'Feux et phares', tires: 'Pneus', brakes: 'Freins', wipers: 'Essuie-glaces', mirrors: 'Rétroviseurs', seatbelts: 'Ceintures', horn: 'Klaxon' }} color="blue" />
                           <InspectionSection title="Dotation Bord" icon="🧰" items={selectedItemForDetails.linkedInspection.equipment} labels={{ spareWheel: 'Roue de secours', jack: 'Cric', triangles: 'Triangles', firstAid: 'Trousse secours', docs: 'Documents' }} color="emerald" />
                           <InspectionSection title="État et Confort" icon="✨" items={selectedItemForDetails.linkedInspection.comfort} labels={{ ac: 'Climatisation', cleanliness: 'Propreté' }} color="purple" note={selectedItemForDetails.linkedInspection.note} />
                         </div>
                      </div>
                    ) : (
                      <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-8 text-center opacity-50">
                         <span className="text-4xl">🛡️</span>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">Aucune inspection Check-Out liée à ce véhicule</p>
                      </div>
                    )}
                  </div>
                 </div>
               ) : selectedItemForDetails.type === 'purchase' ? (
                 /* PURCHASE DETAILS WITH LINKED CHECKLIST */
                 <div className="space-y-8">
                    <section className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="bg-slate-50 rounded-[2rem] p-5 border border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fournisseur</p>
                             <p className="font-black text-slate-800 text-sm truncate">{selectedItemForDetails.supplier_name || '—'}</p>
                          </div>
                          <div className="bg-slate-50 rounded-[2rem] p-5 border border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Véhicule</p>
                             <p className="font-black text-slate-800 text-sm">{selectedItemForDetails.make} {selectedItemForDetails.model} {selectedItemForDetails.year}</p>
                          </div>
                          <div className="bg-slate-50 rounded-[2rem] p-5 border border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">VIN</p>
                             <p className="font-black text-blue-600 text-xs font-mono">{selectedItemForDetails.vin || '—'}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-[2rem] p-5 border border-emerald-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Coût Achat</p>
                             <p className="font-black text-xl text-emerald-700">{(selectedItemForDetails.total_cost||0).toLocaleString()} DA</p>
                          </div>
                       </div>
                    </section>
                    <div>
                       <div className="flex items-center gap-3 mb-4"><span className="h-1.5 w-8 rounded-full bg-slate-300"></span><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checklist d'Achat</p></div>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <InspectionSection title="Contrôle Sécurité" icon="🛡️" items={selectedItemForDetails.safety_checklist} labels={{ lights: 'Feux et phares', tires: 'Pneus', brakes: 'Freins', wipers: 'Essuie-glaces', mirrors: 'Rétroviseurs', seatbelts: 'Ceintures', horn: 'Klaxon' }} color="blue" />
                         <InspectionSection title="Dotation Bord" icon="🧰" items={selectedItemForDetails.equipment_checklist} labels={{ spareWheel: 'Roue de secours', jack: 'Cric', triangles: 'Triangles', firstAid: 'Trousse secours', docs: 'Documents' }} color="emerald" />
                         <InspectionSection title="État et Confort" icon="✨" items={selectedItemForDetails.comfort_checklist} labels={{ ac: 'Climatisation', cleanliness: 'Propreté' }} color="purple" />
                       </div>
                    </div>
                    {selectedItemForDetails.linkedInspection && (
                      <section className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-sm space-y-6">
                         <div className="flex items-center gap-4 pb-4 border-b border-slate-50">
                           <span className="text-3xl">📥</span>
                           <div>
                             <p className="font-black text-slate-900 text-lg">Inspection Check-In associée</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(selectedItemForDetails.linkedInspection.mileage||0).toLocaleString()} KM • {selectedItemForDetails.linkedInspection.partner_name}</p>
                           </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <InspectionSection title="Contrôle Sécurité" icon="🛡️" items={selectedItemForDetails.linkedInspection.safety} labels={{ lights: 'Feux et phares', tires: 'Pneus', brakes: 'Freins', wipers: 'Essuie-glaces', mirrors: 'Rétroviseurs', seatbelts: 'Ceintures', horn: 'Klaxon' }} color="blue" />
                           <InspectionSection title="Dotation Bord" icon="🧰" items={selectedItemForDetails.linkedInspection.equipment} labels={{ spareWheel: 'Roue de secours', jack: 'Cric', triangles: 'Triangles', firstAid: 'Trousse secours', docs: 'Documents' }} color="emerald" />
                           <InspectionSection title="État et Confort" icon="✨" items={selectedItemForDetails.linkedInspection.comfort} labels={{ ac: 'Climatisation', cleanliness: 'Propreté' }} color="purple" note={selectedItemForDetails.linkedInspection.note} />
                         </div>
                      </section>
                    )}
                 </div>
               ) : (
                 /* INSPECTION DETAILS - FULL CHECKLIST */
                 <div className="space-y-8">`;

if (!content.includes(OLD)) {
  console.log('STRING NOT FOUND');
  process.exit(1);
}
content = content.replace(OLD, NEW);
fs.writeFileSync('c:/Users/Admin/Desktop/showroom-management/components/Billing.tsx', content, 'utf8');
console.log('SUCCESS');
