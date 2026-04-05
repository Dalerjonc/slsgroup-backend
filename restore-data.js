const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Dalerjonc/slsgroup-data/main';

console.log('🔄 Restoring dispatch board data from GitHub...');

// Create data directory if needed
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const files = ['trucks.json', 'trailers.json', 'drivers.json', 'weeks-data.json'];
let completed = 0;

function downloadFile(filename) {
  return new Promise((resolve) => {
    const url = `${GITHUB_RAW_BASE}/${filename}`;
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.log(`  ⚠ ${filename}: not found on GitHub, creating empty`);
        const empty = filename === 'weeks-data.json' ? {} : [];
        fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(empty, null, 2));
        resolve();
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(json, null, 2));
          const count = Array.isArray(json) ? json.length : Object.keys(json).length;
          console.log(`  ✓ ${filename}: ${count} items downloaded`);
          resolve();
        } catch (e) {
          console.log(`  ⚠ ${filename}: invalid JSON, creating empty`);
          const empty = filename === 'weeks-data.json' ? {} : [];
          fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(empty, null, 2));
          resolve();
        }
      });
    }).on('error', (e) => {
      console.log(`  ⚠ ${filename}: download error, creating empty`);
      const empty = filename === 'weeks-data.json' ? {} : [];
      fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(empty, null, 2));
      resolve();
    });
  });
}

// Download all files
Promise.all(files.map(downloadFile)).then(() => {
  console.log('\n✅ All data files ready!\n');
}).catch(() => {
  console.log('\n⚠️ Some files failed to download, server starting with available data\n');
});
