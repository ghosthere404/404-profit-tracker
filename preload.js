const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  fetchBalances: () => ipcRenderer.invoke('fetch-balances'),
  resetBaseline: () => ipcRenderer.invoke('reset-baseline'),
  getWallets: () => ipcRenderer.invoke('get-wallets'),
  addWallet: (address) => ipcRenderer.invoke('add-wallet', address),
  removeWallet: (address) => ipcRenderer.invoke('remove-wallet', address),
  deleteAllWallets: () => ipcRenderer.invoke('delete-all-wallets'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history')
});
