const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const REPO_URL = 'https://github.com/Dalerjonc/slsgroup-data.git';

console.log('🔄 Restoring dispatch board data from GitHub...');

try {
  // Check if data directory exists and has .git
  if (fs.existsSync(path.join(DATA_DIR, '.git'))) {
    console.log('📥 Pulling latest data...');
    execSync(`cd ${DATA_DIR} && git pull origin main`, { stdio: 'inherit' });
    console.log('✅ Data restored from GitHub!');
  } else {
    console.log('📦 Cloning data repository...');
    if (fs.existsSync(DATA_DIR)) {
      execSync(`rm -rf ${DATA_DIR}`);
    }
    execSync(`git clone ${REPO_URL} ${DATA_DIR}`, { stdio: 'inherit' });
    console.log('✅ Data cloned from GitHub!');
  }
  
  // Verify files exist
  const files = ['trucks.json', 'trailers.json', 'drivers.json', 'weeks-data.json'];
  files.forEach(file => {
    const filepath = path.join(DATA_DIR, file);
    if (fs.existsSync(filepath)) {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      const count = Array.isArray(data) ? data.length : Object.keys(data).length;
      console.log(`  ✓ ${file}: ${count} items`);
    } else {
      console.log(`  ⚠ ${file}: missing, creating empty`);
      fs.writeFileSync(filepath, JSON.stringify(Array.isArray(data) ? [] : {}, null, 2));
    }
  });
  
  console.log('\n✅ All data files ready!\n');
} catch (error) {
  console.error('❌ Error restoring data:', error.message);
  console.log('⚠️  Server will start with empty data. Data will be backed up on first save.\n');
  
  // Create empty data directory as fallback
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
