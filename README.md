# SolTax AU

AI-powered Solana tax engine for Australian investors. Generate ATO-compliant tax reports with ease.

## Features

- **Multi-Wallet Support**: Track transactions across all your Solana wallets
- **AI Classification**: Claude AI intelligently classifies complex DeFi transactions
- **ATO Compliant**: Reports designed specifically for Australian tax requirements
- **Secure & Private**: Your data is encrypted and never shared with third parties
- **Capital Gains Tracking**: Automatic FIFO cost basis calculation and CGT discount application
- **One-Click Reports**: Generate professional PDF reports ready for your tax return

## Tech Stack

- **Frontend**: Next.js 14 App Router, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Blockchain**: @solana/web3.js for Solana RPC interaction
- **AI**: Anthropic Claude API for transaction classification
- **Reports**: pdf-lib for PDF generation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key
- Solana RPC endpoint

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/soltax-au.git
cd soltax-au
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment variables:
```bash
cp .env.example .env.local
```

4. Fill in your environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_key
ANTHROPIC_API_KEY=your_anthropic_key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
COINGECKO_API_KEY=your_coingecko_key
```

5. Set up the Supabase database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the contents of `schema.sql`

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
soltax/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/                # Base UI components
│   ├── dashboard/         # Dashboard components
│   ├── wallets/           # Wallet components
│   ├── reports/           # Report components
│   └── layout/            # Layout components
├── lib/                   # Core libraries
│   ├── supabase/          # Supabase client
│   ├── solana/            # Solana interaction
│   ├── ato/               # ATO tax rules
│   ├── ai/                # AI classification
│   ├── reports/           # Report generation
│   ├── utils/             # Utilities
│   └── db/                # Database queries
├── types/                 # TypeScript types
└── schema.sql             # Database schema
```

## ATO Compliance

SolTax AU follows ATO guidance for cryptocurrency taxation:

- **CGT Events**: Crypto-to-crypto swaps, sales, and disposals
- **Income**: Staking rewards, airdrops, mining rewards
- **CGT Discount**: 50% discount for assets held 12+ months
- **Personal Use Assets**: Exemption for assets under $10,000 used personally
- **Record Keeping**: 5-year retention requirement

## API Routes

### POST /api/solana/fetch
Fetch transactions for a wallet address.

```json
{
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "walletId": "uuid",
  "limit": 50
}
```

### POST /api/solana/classify
Classify a transaction using AI.

```json
{
  "transactionId": "uuid",
  "parsedTransaction": {...},
  "useAI": true
}
```

### POST /api/reports/generate
Generate a tax report.

```json
{
  "walletId": "uuid",
  "financialYear": 2024,
  "format": "pdf"
}
```

## Development

### Running Tests
```bash
npm test
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
```

## Deployment

SolTax AU is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Disclaimer

This software is for informational purposes only and does not constitute tax advice. The information contained herein is based on ATO guidance available at the time of generation. Tax laws and interpretations may change.

You should consult with a qualified tax professional before lodging your tax return. SolTax AU accepts no liability for errors or omissions in this report or any tax consequences arising from its use.

## License

MIT License - see LICENSE file for details.

## Support

For support, please contact support@soltax.com.au or open an issue on GitHub.
