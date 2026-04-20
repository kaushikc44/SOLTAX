// SolTax AU - Wallet Report Fetcher
// Direct script to fetch wallet data and generate report

const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=3c1b322c-ed6d-4504-ab05-975b38f71ac5';
const WALLET_ADDRESS = 'hU4WPX1qfxbYVSXrE6Gutve7mondWBCv24MMwcFw3pr';

const TOKEN_SYMBOLS = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
};

const PROGRAM_NAMES = {
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca',
  'MarBmsSXTKGS8kVHd7qzpny2qHMg7vrtUuFxNTFdm9b': 'Marinade',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'Jito',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  '11111111111111111111111111111111': 'System Program',
};

async function rpcCall(method, params = []) {
  const response = await fetch(HELIUS_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return response.json();
}

async function getBalance(address) {
  const result = await rpcCall('getBalance', [address]);
  return result.result?.value || 0;
}

async function getSignatures(address, limit = 50) {
  const result = await rpcCall('getSignaturesForAddress', [address, { limit }]);
  return result.result || [];
}

async function getTransaction(signature) {
  const result = await rpcCall('getTransaction', [
    signature,
    { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }
  ]);
  return result.result;
}

function classifyTransaction(tx) {
  if (!tx?.meta) return { type: 'Unknown', program: 'Unknown' };

  const logMessages = tx.meta.logMessages || [];
  const accountKeys = tx.transaction?.message?.accountKeys || [];

  // Get program IDs from accounts
  const programIds = accountKeys.map(k => k.pubkey).filter(k => PROGRAM_NAMES[k]);
  const primaryProgram = programIds.find(id => PROGRAM_NAMES[id]) || 'Unknown';

  // Check for swap
  const hasSwap = logMessages.some(log =>
    log.toLowerCase().includes('swap') || log.includes('Jupiter') || log.includes('Raydium')
  );
  if (hasSwap) return { type: 'Swap', program: PROGRAM_NAMES[primaryProgram] || primaryProgram };

  // Check for stake
  const hasStake = logMessages.some(log =>
    log.toLowerCase().includes('stake') || log.includes('Marinade') || log.includes('Jito')
  );
  if (hasStake) return { type: 'Staking', program: PROGRAM_NAMES[primaryProgram] || primaryProgram };

  // Check for transfer
  const preTokenBalances = tx.meta.preTokenBalances || [];
  const postTokenBalances = tx.meta.postTokenBalances || [];

  if (preTokenBalances.length === 0 && postTokenBalances.length === 0) {
    return { type: 'SOL Transfer', program: 'System Program' };
  }

  return { type: 'Token Transfer', program: 'Token Program' };
}

function formatTimestamp(ts) {
  if (!ts) return 'Unknown';
  return new Date(ts * 1000).toLocaleString('en-AU');
}

function formatSol(lamports) {
  return (lamports / 1e9).toFixed(6);
}

async function main() {
  console.log('='.repeat(70));
  console.log('  SolTax AU - Wallet Tax Report');
  console.log('='.repeat(70));
  console.log(`\nWallet: ${WALLET_ADDRESS}\n`);

  // Get balance
  console.log('Fetching balance...');
  const balance = await getBalance(WALLET_ADDRESS);
  const balanceSol = balance / 1e9;
  const balanceAUD = balanceSol * 200; // Approx SOL price

  console.log(`Balance: ${balanceSol.toFixed(6)} SOL (~$${balanceAUD.toFixed(2)} AUD)\n`);

  // Get signatures
  console.log('Fetching transaction history...');
  const signatures = await getSignatures(WALLET_ADDRESS, 50);
  console.log(`Found ${signatures.length} transactions\n`);

  // Fetch transaction details
  console.log('Fetching transaction details (this may take a moment)...');
  const transactions = [];

  for (let i = 0; i < Math.min(signatures.length, 50); i++) {
    const sig = signatures[i];
    try {
      const tx = await getTransaction(sig.signature);
      if (tx) {
        const classification = classifyTransaction(tx);
        transactions.push({
          signature: sig.signature,
          slot: sig.slot,
          blockTime: sig.blockTime,
          fee: tx.meta?.fee || 0,
          success: !tx.meta?.err,
          ...classification,
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${sig.signature}:`, err.message);
    }

    // Progress indicator
    if ((i + 1) % 5 === 0) {
      process.stdout.write('.');
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nProcessed ${transactions.length} transactions\n`);

  // Statistics
  const successful = transactions.filter(t => t.success).length;
  const failed = transactions.length - successful;
  const totalFees = transactions.reduce((sum, t) => sum + t.fee, 0);

  const txByType = transactions.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {});

  const txByProgram = transactions.reduce((acc, t) => {
    acc[t.program] = (acc[t.program] || 0) + 1;
    return acc;
  }, {});

  // Print report
  console.log('='.repeat(70));
  console.log('  WALLET SUMMARY');
  console.log('='.repeat(70));
  console.log(`Address:      ${WALLET_ADDRESS}`);
  console.log(`Balance:      ${balanceSol.toFixed(6)} SOL ($${balanceAUD.toFixed(2)} AUD)`);
  console.log(`Transactions: ${transactions.length} analyzed`);
  console.log(`Successful:   ${successful}`);
  console.log(`Failed:       ${failed}`);
  console.log(`Total Fees:   ${formatSol(totalFees)} SOL`);

  console.log('\n' + '='.repeat(70));
  console.log('  TRANSACTIONS BY TYPE');
  console.log('='.repeat(70));
  for (const [type, count] of Object.entries(txByType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(25)} ${count.toString().padStart(4)} transactions`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  TRANSACTIONS BY PROGRAM');
  console.log('='.repeat(70));
  for (const [program, count] of Object.entries(txByProgram).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${program.padEnd(25)} ${count.toString().padStart(4)} transactions`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  RECENT TRANSACTIONS');
  console.log('='.repeat(70));
  console.log('Type'.padEnd(15) + 'Status'.padEnd(10) + 'Fee (SOL)'.padEnd(12) + 'Timestamp');
  console.log('-'.repeat(70));

  for (const tx of transactions.slice(0, 10)) {
    const status = tx.success ? 'Success' : 'Failed';
    const time = formatTimestamp(tx.blockTime);
    console.log(
      tx.type.padEnd(15) +
      status.padEnd(10) +
      formatSol(tx.fee).padEnd(12) +
      time
    );
  }

  console.log('\n' + '='.repeat(70));
  console.log('  ATO TAX SUMMARY (Estimated)');
  console.log('='.repeat(70));
  console.log('Note: Full tax calculation requires historical price data.');
  console.log('');
  console.log('Transaction Types for Tax:');
  console.log('  - Swaps: CGT Event (disposal of crypto)');
  console.log('  - Staking Rewards: Ordinary Income');
  console.log('  - Transfers: Generally not taxable');
  console.log('');
  console.log('For complete tax report, historical AUD prices needed for each transaction.');
  console.log('='.repeat(70));
  console.log(`\nReport generated: ${new Date().toLocaleString('en-AU')}`);
}

main().catch(console.error);
