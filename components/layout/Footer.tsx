// SolTax AU - Footer Component
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-white dark:bg-gray-900">
      <div className="container px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-aus-green-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="font-bold text-xl">SolTax AU</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI-powered Solana tax engine for Australian investors. ATO-compliant reports made simple.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-3">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/wallets" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Wallets
                </Link>
              </li>
              <li>
                <Link href="/reports" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Reports
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://ato.gov.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  ATO Guidelines
                </a>
              </li>
              <li>
                <Link href="/help" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Tax Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {currentYear} SolTax AU. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center sm:text-right">
            This software does not constitute tax advice. Please consult with a qualified tax professional.
          </p>
        </div>
      </div>
    </footer>
  );
}
