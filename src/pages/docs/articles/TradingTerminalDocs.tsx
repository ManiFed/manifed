import DocsPage from "../DocsPage";
import { useOutletContext } from "react-router-dom";
export default function TradingTerminalDocs() {
  const {
    isDark
  } = useOutletContext<{
    isDark: boolean;
  }>();
  return <DocsPage title="Trading Terminal" description="Fast keyboard-driven trading on Manifold Markets." breadcrumb="ManiFed Private Client" tableOfContents={[{
    id: "overview",
    label: "Overview"
  }, {
    id: "setup",
    label: "Setup"
  }, {
    id: "basic-orders",
    label: "Basic Orders"
  }, {
    id: "advanced-orders",
    label: "Advanced Orders"
  }, {
    id: "relative-limit-hotkeys",
    label: "Relative Limit Hotkeys"
  }, {
    id: "mc-markets",
    label: "MC Markets"
  }, {
    id: "keyboard-shortcuts",
    label: "Keyboard Shortcuts"
  }]}>
      <section id="overview" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Overview
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          The terminal is one of the best features of ManiFed Private Client! It is very powerful, and knowing how to use it is essential for fast-moving markets.
        </p>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          This is mainly intended for fast-moving markets that exist within a set timeframe. We would not recommend trading long-term markets in the terminal, but if you want to, suit yourself.
        </p>
        <div className={`p-4 rounded-lg border ${isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"}`}>
          <p className={`text-sm ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
            <strong>Note:</strong> It is a work in progress, so feel free to suggest new features/bug fixes to us! And please don't use it to overwhelm the API.
          </p>
        </div>
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
          <li>Navigate to the "Account Settings" section</li>
          <li>Copy your API key</li>
          <li>Paste it into the Terminal when prompted</li>
        </ol>
        <div className={`mt-4 p-4 rounded-lg border ${isDark ? "bg-emerald-900/20 border-emerald-800" : "bg-emerald-50 border-emerald-200"}`}>
          <p className={`text-sm ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
            <strong>Privacy:</strong> Your API key is stored locally in your browser only. We never send it to our servers.
          </p>
        </div>
      </section>

      <section id="basic-orders" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Basic Orders
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Simple market orders for quick execution:
        </p>
        <div className={`font-mono text-sm space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-emerald-400 w-24">100B</code>
            <span>Buy 100 mana of YES at market price</span>
          </div>
          <div className="flex gap-4">
            <code className="text-red-400 w-24">100S</code>
            <span>Buy 100 mana of NO at market price</span>
          </div>
        </div>
        <p className={`mt-4 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          When Auto Mode is off, press Enter to execute market orders.
        </p>
      </section>

      <section id="advanced-orders" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Advanced Orders
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          All advanced orders use the <code className="text-yellow-400">/</code> syntax. You can add an optional number before the first <code>/</code> for expiry in minutes. <strong className={isDark ? "text-white" : "text-gray-900"}>Without a number, orders are indefinite.</strong>
        </p>
        
        <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Limit Orders</h3>
        <div className={`font-mono text-sm space-y-3 mb-6 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-yellow-400 w-36">/100B@45/</code>
            <span>Indefinite limit for 100 YES at 45%</span>
          </div>
          <div className="flex gap-4">
            <code className="text-yellow-400 w-36">30/100B@45/</code>
            <span>30-minute expiry limit for 100 YES at 45%</span>
          </div>
          <div className="flex gap-4">
            <code className="text-yellow-400 w-36">/100S@60/</code>
            <span>Indefinite limit for 100 NO at 60%</span>
          </div>
        </div>

        <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Take Profit (Limit Sell)</h3>
        <p className={`mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Lock in gains by setting a target exit price. Uses your entire position automatically.
        </p>
        <div className={`font-mono text-sm space-y-3 mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-orange-400 w-36">/LS@55/</code>
            <span>Take profit when market reaches 55% (indefinite)</span>
          </div>
          <div className="flex gap-4">
            <code className="text-orange-400 w-36">10/LS@55/</code>
            <span>Take profit at 55% with 10-minute expiry</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            <strong>How Take Profit works:</strong> The system looks at your full position and calculates how many opposite shares you need to buy at your target price to fully hedge. For example, if you hold 100 YES shares and set a take profit at 70%, it places a NO limit order at 30% for 100 shares. When filled, you hold equal YES and NO (guaranteed M$100 payout), locking in your profit.
          </p>
        </div>

        <h3 className={`text-lg font-medium mb-3 mt-6 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Straddle Orders</h3>
        <div className={`font-mono text-sm space-y-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-purple-400 w-36">ST2.5/200/</code>
            <span>Straddle with M$200 split across limits at ±2.5% from current price</span>
          </div>
          <div className="flex gap-4">
            <code className="text-purple-400 w-36">5/ST3/100/</code>
            <span>5-minute expiry straddle with M$100 at ±3%</span>
          </div>
        </div>
        <div className={`mt-3 p-3 rounded-lg border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            <strong>How Straddle works:</strong> Places YES and NO limit orders on either side of the current probability. The amount is split between both orders (M$100 each in the first example above).
          </p>
        </div>
      </section>

      <section id="relative-limit-hotkeys" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Relative Limit Hotkeys
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Hotkeys are made for speed, so manually entering a limit would be counterintuitive. We circumvented this with <strong>relative limits</strong>.
        </p>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          You choose an offset, and we look at the current probability and make a limit order in a nanosecond. This is a very effective tool for market makers.
        </p>
        <div className={`p-4 rounded-lg border ${isDark ? "bg-purple-900/20 border-purple-800" : "bg-purple-50 border-purple-200"}`}>
          <p className={`text-sm ${isDark ? "text-purple-400" : "text-purple-700"}`}>
            <strong>Example:</strong> If the market is at 50% and you have a hotkey set to "relative offset: -5", pressing that hotkey places a limit order at 45%.
          </p>
        </div>
        <p className={`mt-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Configure hotkeys in the Settings tab with these options:
        </p>
        <ul className={`list-disc list-inside space-y-2 mt-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li><strong>Key:</strong> Single character to trigger the order</li>
          <li><strong>Side:</strong> YES, NO, or STRADDLE</li>
          <li><strong>Amount:</strong> Mana to spend</li>
          <li><strong>Order Type:</strong> Market, Limit (fixed %), or Limit (relative %)</li>
          <li><strong>Straddle Delta:</strong> For straddle orders, how far from current price to place limits</li>
          <li><strong>MC Option #:</strong> For multiple choice markets, specify which option</li>
        </ul>
      </section>

      <section id="mc-markets" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          MC Markets (Multiple Choice)
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          MC markets are more complex, but we found a way to make them work efficiently. We recommend using <strong>hotkeyed orders</strong> for speed and flexibility when trading MC markets.
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
            <span>Jump directly to option #7</span>
          </div>
        </div>

        <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Trading Specific Options</h3>
        <p className={`mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Use the option number prefix to trade a specific option:
        </p>
        <div className={`font-mono text-sm space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-emerald-400 w-28">3:100B</code>
            <span>Buy 100 YES on option #3</span>
          </div>
          <div className="flex gap-4">
            <code className="text-red-400 w-28">3:100S</code>
            <span>Buy 100 NO on option #3</span>
          </div>
          <div className="flex gap-4">
            <code className="text-yellow-400 w-28">3:100B@45/</code>
            <span>Limit YES on option #3 at 45%</span>
          </div>
        </div>
        <div className={`mt-4 p-3 rounded-lg border ${isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
          <p className={`text-sm ${isDark ? "text-blue-400" : "text-blue-700"}`}>
            <strong>Tip:</strong> Click on any MC option in the terminal to automatically populate the command line with that option's prefix (e.g., "2:").
          </p>
        </div>
      </section>

      <section id="keyboard-shortcuts" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Keyboard Shortcuts
        </h2>
        <div className={`font-mono text-sm space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <div className="flex gap-4">
            <code className="text-gray-400 w-28">Cmd/Ctrl+L</code>
            <span>Cancel all active limit orders</span>
          </div>
          <div className="flex gap-4">
            <code className="text-gray-400 w-28">Cmd/Ctrl+X</code>
            <span>Sell all positions AND cancel all limit orders</span>
          </div>
        </div>
      </section>
    </DocsPage>;
}