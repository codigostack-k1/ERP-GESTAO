const fs = require('fs');
const path = './src/utils/receipt.ts';
let content = fs.readFileSync(path, 'utf8');

// Update getCommonStylesA4
content = content.replace(
  ".header { display: flex; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }",
  ".header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }\n    .header-left { display: flex; align-items: center; gap: 15px; }\n    .company-logo { max-width: 120px; max-height: 60px; object-fit: contain; border-radius: 8px; }"
);

// Replace <div class="company-info">
content = content.replace(
  /<div class="company-info">/g,
  '<div class="header-left">${config.logo ? `<img src="${config.logo}" class="company-logo" alt="Logo" />` : \'\'}<div class="company-info">'
);

// Replace </div><div class="doc-title">
content = content.replace(
  /<\/div><div class="doc-title">/g,
  '</div></div><div class="doc-title">'
);

fs.writeFileSync(path, content);
console.log('Done');
