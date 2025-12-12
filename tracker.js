import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const REFRESH_INTERVAL = 10000; // 10 seconds
const BASELINE_FILE = join(__dirname, 'baseline.json');
const WALLETS_FILE = join(__dirname, 'wallets.json');

class WalletTracker {
  constructor() {
    this.connection = new Connection(RPC_ENDPOINT, 'confirmed');
    this.wallets = [];
    this.baseline = null;
    this.currentTotal = 0;
  }

  loadWallets() {
    try {
      const data = fs.readFileSync(WALLETS_FILE, 'utf8');
      const addresses = JSON.parse(data);
      
      // Filter out placeholder addresses
      this.wallets = addresses.filter(addr => 
        addr && !addr.includes('PASTE_YOUR_WALLET')
      );
      
      if (this.wallets.length === 0) {
        console.log(chalk.red('❌ No wallet addresses found in wallets.json'));
        console.log(chalk.yellow('Please add your wallet public keys to wallets.json'));
        process.exit(1);
      }
      
      console.log(chalk.green(`✓ Loaded ${this.wallets.length} wallet addresses`));
    } catch (error) {
      console.log(chalk.red('❌ Error loading wallets.json:'), error.message);
      process.exit(1);
    }
  }

  loadBaseline() {
    try {
      if (fs.existsSync(BASELINE_FILE)) {
        const data = fs.readFileSync(BASELINE_FILE, 'utf8');
        this.baseline = JSON.parse(data);
        console.log(chalk.cyan(`📊 Baseline loaded: ${this.baseline.total.toFixed(4)} SOL`));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not load baseline:'), error.message);
    }
  }

  saveBaseline(total) {
    try {
      const data = {
        total: total,
        timestamp: new Date().toISOString(),
        walletCount: this.wallets.length
      };
      fs.writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2));
      this.baseline = data;
      console.log(chalk.green(`✓ Baseline saved: ${total.toFixed(4)} SOL`));
    } catch (error) {
      console.log(chalk.red('❌ Error saving baseline:'), error.message);
    }
  }

  async getBalance(publicKey) {
    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.log(chalk.red(`Error fetching balance for ${publicKey.substring(0, 8)}...`));
      return 0;
    }
  }

  async fetchAllBalances() {
    const balances = [];
    let total = 0;

    console.log(chalk.blue('\n🔄 Fetching balances...\n'));

    for (let i = 0; i < this.wallets.length; i++) {
      const wallet = this.wallets[i];
      const balance = await this.getBalance(wallet);
      balances.push({ address: wallet, balance });
      total += balance;
      
      // Show progress
      process.stdout.write(`Progress: ${i + 1}/${this.wallets.length}\r`);
    }

    console.log(''); // New line after progress
    this.currentTotal = total;
    return balances;
  }

  clearScreen() {
    console.clear();
  }

  displayBalances(balances) {
    this.clearScreen();
    
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║           SOLANA WALLET BALANCE TRACKER                   ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));
    
    console.log(chalk.gray(`Last Updated: ${new Date().toLocaleString()}`));
    console.log(chalk.gray(`Tracking ${balances.length} wallets\n`));
    
    console.log(chalk.bold('─'.repeat(70)));
    console.log(chalk.bold(
      'Wallet Address'.padEnd(45) + 
      'Balance (SOL)'.padStart(15)
    ));
    console.log(chalk.bold('─'.repeat(70)));
    
    balances.forEach((wallet, index) => {
      const shortAddr = wallet.address.substring(0, 8) + '...' + wallet.address.substring(wallet.address.length - 8);
      const balanceStr = wallet.balance.toFixed(4);
      
      const color = wallet.balance > 0 ? chalk.green : chalk.gray;
      console.log(
        color(`${(index + 1).toString().padStart(2)}. ${shortAddr.padEnd(40)}`) +
        color(balanceStr.padStart(15))
      );
    });
    
    console.log(chalk.bold('─'.repeat(70)));
    console.log(chalk.bold.yellow(`\nTOTAL BALANCE: ${this.currentTotal.toFixed(4)} SOL`));
    
    if (this.baseline) {
      const difference = this.currentTotal - this.baseline.total;
      const percentage = this.baseline.total > 0 
        ? ((difference / this.baseline.total) * 100).toFixed(2) 
        : '0.00';
      
      const diffColor = difference >= 0 ? chalk.green : chalk.red;
      const symbol = difference >= 0 ? '▲' : '▼';
      
      console.log(chalk.bold('\n📊 COMPARISON TO BASELINE:'));
      console.log(chalk.gray(`   Baseline: ${this.baseline.total.toFixed(4)} SOL (${new Date(this.baseline.timestamp).toLocaleString()})`));
      console.log(diffColor(`   ${symbol} Difference: ${difference >= 0 ? '+' : ''}${difference.toFixed(4)} SOL (${difference >= 0 ? '+' : ''}${percentage}%)`));
    } else {
      console.log(chalk.yellow('\n💡 Tip: Run "npm run reset" to set current balance as baseline'));
    }
    
    console.log(chalk.gray('\n─'.repeat(70)));
    console.log(chalk.gray('🔄 Auto-refreshing every 10 seconds... Press Ctrl+C to exit'));
    console.log(chalk.gray('─'.repeat(70)));
  }

  async run() {
    this.loadWallets();
    this.loadBaseline();
    
    // Check if --reset flag is passed
    if (process.argv.includes('--reset')) {
      const balances = await this.fetchAllBalances();
      this.saveBaseline(this.currentTotal);
      this.displayBalances(balances);
      console.log(chalk.green('\n✓ Baseline has been reset to current total'));
      return;
    }
    
    // Initial fetch
    let balances = await this.fetchAllBalances();
    this.displayBalances(balances);
    
    // Auto-refresh
    setInterval(async () => {
      balances = await this.fetchAllBalances();
      this.displayBalances(balances);
    }, REFRESH_INTERVAL);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Exiting tracker...'));
  process.exit(0);
});

// Start the tracker
const tracker = new WalletTracker();
tracker.run().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
