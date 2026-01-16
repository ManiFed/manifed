import DocsPage from "../DocsPage";
import { useOutletContext } from "react-router-dom";

export default function CoreConceptsDoc() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage
      title="Core Concepts"
      description="Understanding the fundamentals of prediction markets and ManiFed."
      tableOfContents={[
        { id: "prediction-markets", label: "Prediction Markets" },
        { id: "mana", label: "Mana Currency" },
        { id: "probability", label: "Probability" },
        { id: "order-types", label: "Order Types" },
        { id: "positions", label: "Positions & P&L" },
      ]}
    >
      <section id="prediction-markets" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Prediction Markets
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Prediction markets are speculative markets where participants trade on the outcomes of future events. 
          The price of a contract reflects the collective probability estimate of an event occurring.
        </p>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          On Manifold Markets, you buy YES or NO shares on questions. If the question resolves YES, 
          YES shares pay out M$1 each. If it resolves NO, NO shares pay out M$1 each.
        </p>
      </section>

      <section id="mana" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Mana (M$)
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Mana (M$) is the virtual currency used on Manifold Markets. Key points:
        </p>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>You receive free mana when you sign up</li>
          <li>You can earn mana by making accurate predictions</li>
          <li>Mana can be purchased or donated to charity</li>
          <li>All trading on ManiFed is done with mana</li>
        </ul>
      </section>

      <section id="probability" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Probability
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Market probability represents the current price of YES shares. A market at 70% means:
        </p>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>YES shares cost approximately M$0.70</li>
          <li>NO shares cost approximately M$0.30</li>
          <li>The crowd estimates a 70% chance the event occurs</li>
        </ul>
        <div className={`mt-4 p-4 rounded-lg border ${isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
          <p className={`text-sm ${isDark ? "text-blue-400" : "text-blue-700"}`}>
            <strong>Note:</strong> Prices are determined by an automated market maker (AMM), not a traditional order book. 
            Large trades will move the price more than small trades.
          </p>
        </div>
      </section>

      <section id="order-types" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Order Types
        </h2>
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>Market Orders</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Execute immediately at the current market price. Use when you want instant execution.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>Limit Orders</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Execute only when the market reaches your specified price. Use when you want a better price and can wait.
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-purple-400" : "text-purple-600"}`}>Straddle Orders</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Place YES and NO limit orders at equal distances from current price. Useful for market making.
            </p>
          </div>
        </div>
      </section>

      <section id="positions" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Positions & P&L
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Your position shows how many shares you hold in each market:
        </p>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li><strong>YES shares:</strong> Profit if the market resolves YES</li>
          <li><strong>NO shares:</strong> Profit if the market resolves NO</li>
          <li><strong>P&L:</strong> Your unrealized profit/loss based on current price vs. entry price</li>
        </ul>
        <p className={`mt-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          You can close positions by selling shares back to the market, or let them resolve naturally.
        </p>
      </section>
    </DocsPage>
  );
}
