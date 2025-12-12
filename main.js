const { app, BrowserWindow, ipcMain } = require('electron');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Disable GPU before app is ready
app.disableHardwareAcceleration();

// Use Helius RPC for fast, reliable access
// Get your free API key at https://helius.dev
const HELIUS_API_KEY = 'YOUR_HELIUS_API_KEY_HERE';
const RPC_ENDPOINT = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const BASELINE_FILE = path.join(__dirname, 'baseline.json');
const WALLETS_FILE = path.join(__dirname, 'wallets.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');

let mainWindow;
let connection;
let wallets = [];
let baseline = null;
let history = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    frame: true,
    transparent: false,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableWebGL: false,
      safeDialogs: true
    }
  });

  mainWindow.loadFile('index.html');
  
  // Keep window always on top
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true);
  
  // Optional: Remove menu bar for cleaner look
  mainWindow.setMenuBarVisibility(false);
}

function loadWallets() {
  try {
    const data = fs.readFileSync(WALLETS_FILE, 'utf8');
    const addresses = JSON.parse(data);
    wallets = addresses.filter(addr => addr && !addr.includes('PASTE_YOUR_WALLET'));
    console.log(`Loaded ${wallets.length} wallet addresses`);
    return true;
  } catch (error) {
    console.error('Error loading wallets:', error);
    return false;
  }
}

function loadBaseline() {
  try {
    if (fs.existsSync(BASELINE_FILE)) {
      const data = fs.readFileSync(BASELINE_FILE, 'utf8');
      baseline = JSON.parse(data);
      console.log('Baseline loaded:', baseline.total);
    }
  } catch (error) {
    console.error('Error loading baseline:', error);
  }
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      history = JSON.parse(data);
      console.log(`Loaded ${history.length} history entries`);
    }
  } catch (error) {
    console.error('Error loading history:', error);
    history = [];
  }
}

function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log('History saved');
    return true;
  } catch (error) {
    console.error('Error saving history:', error);
    return false;
  }
}

function saveBaseline(total) {
  try {
    // If there was a previous baseline, save it to history
    if (baseline && baseline.total !== total) {
      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        startBalance: baseline.total,
        endBalance: total,
        profit: total - baseline.total,
        profitPercent: baseline.total > 0 ? ((total - baseline.total) / baseline.total * 100) : 0,
        walletCount: wallets.length
      };
      history.unshift(historyEntry); // Add to beginning
      
      // Keep only last 50 entries
      if (history.length > 50) {
        history = history.slice(0, 50);
      }
      
      saveHistory();
    }
    
    const data = {
      total: total,
      timestamp: new Date().toISOString(),
      walletCount: wallets.length
    };
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2));
    baseline = data;
    console.log('Baseline saved:', total);
    return true;
  } catch (error) {
    console.error('Error saving baseline:', error);
    return false;
  }
}

async function getBalance(publicKey) {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add timeout to the request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const balancePromise = (async () => {
        const pubKey = new PublicKey(publicKey);
        const balance = await connection.getBalance(pubKey);
        return balance / LAMPORTS_PER_SOL;
      })();
      
      return await Promise.race([balancePromise, timeoutPromise]);
      
    } catch (error) {
      lastError = error;
      console.log(`Retry ${attempt + 1} for ${publicKey.substring(0, 8)}...`, error.message);
      
      // Wait before retry with exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }
  }
  
  console.error(`Failed to fetch balance for ${publicKey.substring(0, 8)}...`, lastError?.message);
  return 0;
}

async function fetchAllBalances() {
  let total = 0;
  const balances = [];
  let successCount = 0;

  console.log(`Fetching balances for ${wallets.length} wallets...`);

  // Process in smaller batches for better reliability
  const batchSize = 5;
  for (let i = 0; i < wallets.length; i += batchSize) {
    const batch = wallets.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(wallets.length/batchSize)}`);
    
    const batchPromises = batch.map(wallet => getBalance(wallet));
    const batchBalances = await Promise.all(batchPromises);
    
    batch.forEach((wallet, idx) => {
      const balance = batchBalances[idx];
      balances.push({ address: wallet, balance });
      total += balance;
      if (balance > 0) successCount++;
    });
    
    // Delay between batches
    if (i + batchSize < wallets.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  console.log(`Fetched balances: ${successCount}/${wallets.length} successful, total: ${total.toFixed(4)} SOL`);

  return {
    total,
    balances,
    walletCount: wallets.length,
    baseline: baseline,
    history: history
  };
}

// IPC Handlers
ipcMain.handle('fetch-balances', async () => {
  try {
    const data = await fetchAllBalances();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-baseline', async () => {
  try {
    const data = await fetchAllBalances();
    const success = saveBaseline(data.total);
    
    if (success) {
      return { success: true, data: { ...data, baseline, history } };
    } else {
      return { success: false, error: 'Failed to save baseline' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-history', async () => {
  try {
    loadHistory();
    return { success: true, history };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-history', async () => {
  try {
    history = [];
    saveHistory();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-wallets', async () => {
  try {
    loadWallets();
    return { success: true, wallets };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-wallet', async (event, address) => {
  try {
    if (!address || address.trim() === '') {
      throw new Error('Invalid wallet address');
    }
    
    // Validate it's a valid Solana address
    new PublicKey(address.trim());
    
    if (!wallets.includes(address.trim())) {
      wallets.push(address.trim());
      fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
      return { success: true, wallets };
    } else {
      throw new Error('Wallet already exists');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-wallet', async (event, address) => {
  try {
    const index = wallets.indexOf(address);
    if (index > -1) {
      wallets.splice(index, 1);
      fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
      return { success: true, wallets };
    } else {
      throw new Error('Wallet not found');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-all-wallets', async () => {
  try {
    wallets = [];
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
    return { success: true, wallets };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  // Initialize connection with Helius
  connection = new Connection(RPC_ENDPOINT, 'confirmed');
  console.log('Using Helius RPC');
  
  // Test connection
  try {
    const version = await connection.getVersion();
    console.log('RPC connection test successful:', version['solana-core']);
  } catch (error) {
    console.error('RPC connection test failed:', error.message);
  }
  
  // Load wallets, baseline, and history
  if (!loadWallets()) {
    console.error('Failed to load wallets. Please check wallets.json');
  }
  loadBaseline();
  loadHistory();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
