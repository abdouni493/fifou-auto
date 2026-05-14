const fs = require('fs');
const filePath = 'C:/Users/Admin/Desktop/showroom-management/components/POS.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace('{!isDrafting ? (', '{!isDrafting && (');

const wizardMarker = '{/* MULTI-STEP SALE WIZARD */}';
if (content.includes(wizardMarker)) {
    const parts = content.split(wizardMarker);
    parts[0] = parts[0].trimEnd() + '\n      )}\n        ';
    content = parts.join(wizardMarker);
}

const oldUiStart = '             <div className="space-y-12">\n                <Card title="Identité Acheteur" icon="👤">';
const oldUiEnd = '        </div>\n      )}\n\n      {/* Sales History Modal */}';

if (content.includes(oldUiStart) && content.includes(oldUiEnd)) {
    const startIdx = content.indexOf(oldUiStart);
    const endIdx = content.indexOf(oldUiEnd) + '        </div>\n      )}'.length;
    content = content.substring(0, startIdx) + content.substring(endIdx);
} else {
    console.log('Could not find old UI boundaries');
    const fallbackEnd = '        </div>\n      )}\n\n      {/* Sales History';
    if (content.includes(oldUiStart) && content.includes(fallbackEnd)) {
        const startIdx = content.indexOf(oldUiStart);
        const endIdx = content.indexOf(fallbackEnd) + '        </div>\n      )}'.length;
        content = content.substring(0, startIdx) + content.substring(endIdx);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File updated successfully.');
