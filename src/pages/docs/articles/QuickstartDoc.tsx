import DocsPage from "../DocsPage";
import { useOutletContext, Link } from "react-router-dom";
import { ArrowRight, Key, Search, Zap } from "lucide-react";

export default function QuickstartDoc() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage
      title="Quickstart"
      description="Get up and running with ManiFed in under 5 minutes."
      tableOfContents={[
        { id: "step-1", label: "1. Get Your API Key" },
        { id: "step-2", label: "2. Connect to ManiFed" },
        { id: "step-3", label: "3. Make Your First Trade" },
        { id: "next-steps", label: "Next Steps" },
      ]}
    >
      <section id="step-1" className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
            <Key className="w-4 h-4" />
          </div>
          <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            1. Get Your Manifold API Key
          </h2>
        </div>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          ManiFed uses your Manifold Markets API key to execute trades on your behalf. Your key stays local—we never store it on our servers.
        </p>
        <ol className={`list-decimal list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Go to <a href="https://manifold.markets/profile" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">manifold.markets/profile</a></li>
          <li>Scroll down to "API Key" section</li>
          <li>Click "Generate new key" if you don't have one</li>
          <li>Copy your API key</li>
        </ol>
        <div className={`mt-4 p-4 rounded-lg border ${isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"}`}>
          <p className={`text-sm ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
            <strong>Security:</strong> Your API key is stored only in your browser's local storage. Never share it with anyone.
          </p>
        </div>
      </section>

      <section id="step-2" className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"}`}>
            <Search className="w-4 h-4" />
          </div>
          <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            2. Connect to ManiFed
          </h2>
        </div>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Navigate to the Trading Terminal and enter your API key:
        </p>
        <ol className={`list-decimal list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Go to the <Link to="/terminal" className="text-blue-500 hover:underline">Trading Terminal</Link></li>
          <li>Click "Enter Terminal" on the landing page</li>
          <li>Paste your API key in the settings panel</li>
          <li>You'll see a green "LIVE" indicator when connected</li>
        </ol>
      </section>

      <section id="step-3" className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
            <Zap className="w-4 h-4" />
          </div>
          <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            3. Make Your First Trade
          </h2>
        </div>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Search for a market and execute your first trade:
        </p>
        <ol className={`list-decimal list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Use the search bar to find a market you're interested in</li>
          <li>Click on a market to select it</li>
          <li>Type a command like <code className="text-emerald-400">10B</code> (buy M$10 of YES)</li>
          <li>Press Enter to execute the trade</li>
        </ol>
        <div className={`mt-4 p-4 rounded-lg border ${isDark ? "bg-emerald-900/20 border-emerald-800" : "bg-emerald-50 border-emerald-200"}`}>
          <p className={`text-sm font-mono ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
            <strong>Quick commands:</strong><br />
            • <code>100B</code> — Buy M$100 of YES<br />
            • <code>100S</code> — Buy M$100 of NO<br />
            • <code>/100B@45/</code> — Limit order for YES at 45%
          </p>
        </div>
      </section>

      <section id="next-steps" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Next Steps
        </h2>
        <div className="grid gap-4">
          <Link
            to="/docs/trading-terminal"
            className={`block p-4 rounded-lg border transition-colors ${
              isDark 
                ? "bg-gray-900/50 border-gray-800 hover:border-gray-700" 
                : "bg-gray-50 border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Trading Terminal Guide
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Learn all the keyboard shortcuts and advanced order types.
                </p>
              </div>
              <ArrowRight className={`w-4 h-4 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
            </div>
          </Link>
          <Link
            to="/docs/fintech"
            className={`block p-4 rounded-lg border transition-colors ${
              isDark 
                ? "bg-gray-900/50 border-gray-800 hover:border-gray-700" 
                : "bg-gray-50 border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Explore Private Client
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Discover AI arbitrage, index funds, and more advanced tools.
                </p>
              </div>
              <ArrowRight className={`w-4 h-4 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
            </div>
          </Link>
        </div>
      </section>
    </DocsPage>
  );
}
