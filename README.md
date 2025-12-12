<img width="636" height="1016" alt="image" src="https://github.com/user-attachments/assets/ed2f72df-0181-4882-a635-b87282254be9" /># 404 Profit Tracker 💰

Desktop widget to track balances across multiple Solana wallets for memecoin launches.

## 🚀 Quick Launch

**Double-click `launch-tracker.bat` to start the tracker!**

Or create a desktop shortcut:
1. Right-click `launch-tracker.bat`
2. Select "Send to" → "Desktop (create shortcut)"
3. Rename the shortcut to "Wallet Tracker"

## How to Use

### Your New Workflow:

1. **📊 Check Balances**: Click "⚡ Update Balance" to see current totals
2. **🎯 Before Launch**: Click "🔄 Reset Baseline" to set your starting point  
3. **💰 After Trading**: Click "⚡ Update Balance" to see profit/loss
   - 🟢 **GREEN** = Profit
   - 🔴 **RED** = Loss
4. **📈 View History**: Click "📊 Launch History" to see all your sessions
5. **🔄 Next Launch**: Reset baseline and repeat

### Features:

✅ **No Auto-Refresh** - Manual updates only, when YOU want  
✅ **Always On Top** - Widget stays visible while you work  
✅ **Launch History** - Complete tracking of all your sessions  
✅ **Wallet Management** - Add/remove wallets anytime  
✅ **Helius RPC** - Fast, reliable balance fetching  
✅ **Dark Theme** - Easy on the eyes with bright, clear text  
<img width="462" height="624" alt="image" src="https://github.com/user-attachments/assets/08140d15-ddf0-4e14-bba5-1fe05a3ee613" />
<img width="610" height="356" alt="image" src="https://github.com/user-attachments/assets/aebca137-b960-40fa-8387-7579e2dbe81c" />

### Files:

- `launch-tracker.bat` - **Double-click to start** 🚀
- `wallets.json` - Your wallet public keys
- `history.json` - Auto-saved launch history
- `baseline.json` - Current baseline data

### Setup (First Time Only):

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Helius API:**
   - Get a free API key at [helius.dev](https://helius.dev)
   - Open `main.js` and replace `YOUR_HELIUS_API_KEY_HERE` with your key

3. **Add your wallet addresses:**
   - Use "📝 Manage Wallets" in the app
   - Or edit `wallets.json` directly

4. **Create desktop shortcut:**
   - Right-click `launch-tracker.bat`
   - Send to Desktop

### Tips:

- The widget stays on top so you can monitor while trading
- History automatically saves each time you reset baseline
- Wallet changes save automatically
- Use "Clear All" in history to start fresh

Perfect for tracking memecoin launch results! 💎🚀
