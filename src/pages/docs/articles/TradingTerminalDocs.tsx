import DocsPage from "../DocsPage";
import { useOutletContext } from "react-router-dom";

export default function TradingTerminalDocs() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage
      title="Trading Terminal"
      description="Fast keyboard-driven trading on Manifold Markets."
      breadcrumb="ManiFed Fintech"
      tableOfContents={[
        { id: "overview", label: "Overview" },
        { id: "setup", label: "Setup" },
        { id: "commands", label: "Command Syntax" },
        { id: "mc-markets", label: "Multiple Choice Markets" },
        { id: "hotkeys", label: "Hotkeys" },
        { id: "keyboard-shortcuts", label: "Keyboard Shortcuts" },
      ]}
    >
      <section id="overview" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Overview
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          The ManiFed Trading Terminal is a professional-grade interface for executing trades on Manifold Markets
          with exceptional speed. Using keyboard shortcuts and command syntax, you can place orders faster than
          through the standard Manifold interface.
        </p>
      </section>

      <section id="setup" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Setup
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          To use the Trading Terminal, you'll need your Manifold API key:
        </p>
        <ol className={`list-decimal list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Go to your Manifold account settings</li>
          <li>Navigate to the API section</li>
          <li>Copy your API key</li>
          <li>Paste it into the Terminal's Settings tab</li>
        </ol>
        <div className={`mt-4 p-4 rounded-lg border ${isDark ? "bg-emerald-900/20 border-emerald-800" : "bg-emerald-50 border-emerald-200"}`}>
          <p className={`text-sm ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
            <strong>Privacy:</strong> Your API key is stored locally in your browser only. We never send it to our servers.
          </p>
        </div>
      </section>

      <section id="commands" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Command Syntax
        </h2>
        
        <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Market Orders</h3>
        <div className={`font-mono text-sm space-y-2 mb-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-emerald-400 w-24">100B</code>
            <span>Buy 100 mana of YES at market price</span>
          </div>
          <div className="flex gap-4">
            <code className="text-red-400 w-24">100S</code>
            <span>Buy 100 mana of NO at market price</span>
          </div>
        </div>

        <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Limit Orders</h3>
        <div className={`font-mono text-sm space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-yellow-400 w-32">/100B@45</code>
            <span>Limit YES @45% (requires Enter to execute)</span>
          </div>
          <div className="flex gap-4">
            <code className="text-yellow-400 w-32">/100B@45L</code>
            <span>Limit YES @45% (auto-executes with L suffix)</span>
          </div>
          <div className="flex gap-4">
            <code className="text-yellow-400 w-32">30/100B@45L</code>
            <span>Limit YES @45%, cancel after 30 minutes</span>
          </div>
        </div>
      </section>

      <section id="mc-markets" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Multiple Choice Markets
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          The terminal supports multiple choice markets with special navigation and trading syntax.
        </p>
        
        <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Navigation</h3>
        <div className={`font-mono text-sm space-y-2 mb-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-blue-400 w-24">↑ / W</code>
            <span>Move selection up</span>
          </div>
          <div className="flex gap-4">
            <code className="text-blue-400 w-24">↓ / S</code>
            <span>Move selection down</span>
          </div>
          <div className="flex gap-4">
            <code className="text-blue-400 w-24">#7</code>
            <span>Jump to option #7</span>
          </div>
        </div>

        <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Trading Specific Options</h3>
        <div className={`font-mono text-sm space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-emerald-400 w-24">3:100B</code>
            <span>Buy 100 YES on option #3</span>
          </div>
          <div className="flex gap-4">
            <code className="text-red-400 w-24">3:100S</code>
            <span>Buy 100 NO on option #3</span>
          </div>
          <div className="flex gap-4">
            <code className="text-yellow-400 w-32">3:100B@45L</code>
            <span>Limit YES on option #3 @45%</span>
          </div>
        </div>
      </section>

      <section id="hotkeys" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Hotkeys
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Configure custom hotkeys to execute preset orders with a single keypress. Each hotkey can be configured with:
        </p>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li><strong>Key:</strong> Single character to trigger the order</li>
          <li><strong>Side:</strong> YES or NO</li>
          <li><strong>Amount:</strong> Mana to spend</li>
          <li><strong>Order Type:</strong> Market, Limit (fixed %), or Limit (relative %)</li>
          <li><strong>MC Option #:</strong> For multiple choice markets, specify which option (leave empty to use selected)</li>
        </ul>
      </section>

      <section id="keyboard-shortcuts" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Keyboard Shortcuts
        </h2>
        <div className={`font-mono text-sm space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-gray-400 w-24">Cmd+X</code>
            <span>Sell all positions in active market</span>
          </div>
        </div>
      </section>
    </DocsPage>
  );
}
