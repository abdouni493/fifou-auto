const fs = require('fs');
let content = fs.readFileSync('c:/Users/Admin/Desktop/showroom-management/components/Billing.tsx', 'utf8');

// The sale branch currently has:
// line 715: {selectedItemForDetails.type === 'sale' ? (
// line 717: <div className="grid...">  ← sale 2-col grid starts
// ...
// line 809: </div>  ← sale 2-col grid ends
// line 811: {/* LINKED INSPECTION CHECKLIST */}  ← floating sibling (ERROR)
// ...
// line 838: </div>  ← linked inspection section end
// line 839: </div>  ← extra stray closing div (ERROR)
// line 840: ) : selectedItemForDetails.type === 'purchase' ? (

// Fix: wrap sale branch in <> fragment, remove stray </div> at line 839

const OLD_SALE_OPEN = `               {selectedItemForDetails.type === 'sale' ? (
                 /* SALE DETAILS - REDESIGNED */
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">`;

const NEW_SALE_OPEN = `               {selectedItemForDetails.type === 'sale' ? (
                 /* SALE DETAILS - REDESIGNED */
                 <>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">`;

if (!content.includes(OLD_SALE_OPEN)) {
  console.log('SALE OPEN NOT FOUND');
  // Try to show what we have
  const idx = content.indexOf('SALE DETAILS - REDESIGNED');
  console.log('Context:', JSON.stringify(content.slice(idx-100, idx+80)));
  process.exit(1);
}
content = content.replace(OLD_SALE_OPEN, NEW_SALE_OPEN);
console.log('Step 1: Added fragment open - OK');

// Remove the stray extra </div> between the checklist section end and the ) :
// Pattern: end of linked inspection div + stray </div> + ) : purchase ?
const OLD_END = `                  </div>
                ) : selectedItemForDetails.type === 'purchase' ? (`;

const NEW_END = `                  </div>
                 </>
                ) : selectedItemForDetails.type === 'purchase' ? (`;

if (!content.includes(OLD_END)) {
  console.log('END PATTERN NOT FOUND');
  const idx = content.indexOf("type === 'purchase'");
  console.log('Context:', JSON.stringify(content.slice(idx-200, idx+60)));
  process.exit(1);
}
content = content.replace(OLD_END, NEW_END);
console.log('Step 2: Closed fragment - OK');

fs.writeFileSync('c:/Users/Admin/Desktop/showroom-management/components/Billing.tsx', content, 'utf8');
console.log('SUCCESS');
