const fs = require('fs');
const path = require('path');
const { mockStore } = require('../config/mockData');

const DATA_FILE = path.join(__dirname, '../../data/store.json');

// Initialize persistent file store if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(mockStore, null, 2), 'utf-8');
  console.log('[Store] Initialized persistent data store at backend/data/store.json');
}

/**
 * Loads data from persistent file
 */
function getStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Store Error] Reading store.json:', err.message);
    return mockStore;
  }
}

/**
 * Saves changes to persistent disk store
 */
function saveStore(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Store Error] Writing store.json:', err.message);
  }
}

module.exports = {
  getStore,
  saveStore
};
