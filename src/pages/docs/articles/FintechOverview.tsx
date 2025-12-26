import DocsPage from "../DocsPage";
import { useOutletContext, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FintechOverview() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  const products = [
    {
      title: "Trading Terminal",
      description: "Fast keyboard-driven trading interface with hotkeys and command syntax.",
      path: "/docs/trading-terminal",
    },
    {
      title: "Index Funds",
      description: "Execute diversified bets across curated market groups with one click.",
      path: "/docs/index-funds",
    },
    {
      title: "Advanced Orders",
      description: "Limit sell orders with automatic profit-taking and hedging strategies.",
      path: "/docs/advanced-orders",
    },
    {
      title: "Calibration Analysis",
      description: "Analyze your prediction accuracy with Brier scores and calibration graphs.",
      path: "/docs/calibration",
    },
    {
      title: "Bot Builder",
      description: "Create and test custom trading strategies with modular code snippets.",
      path: "/docs/bot-builder",
    },
    {
      title: "AI Arbitrage Scanner",
      description: "Discover mispriced correlated markets using AI-powered analysis.",
      path: "/docs/arbitrage",
    },
  ];

  return (
    <DocsPage
      title="ManiFed Fintech"
      description="Advanced prediction market analysis and trading tools."
      tableOfContents={[
        { id: "overview", label: "Overview" },
        { id: "products", label: "Products" },
        { id: "subscription", label: "Subscription" },
      ]}
    >
      <section id="overview" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Overview
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          ManiFed Fintech is a suite of professional trading and analysis tools designed for serious 
          prediction market participants. Access requires a Fintech subscription, which can be 
          purchased with mana.
        </p>
      </section>

      <section id="products" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Products
        </h2>
        
        <div className="grid gap-4">
          {products.map((product) => (
            <Link
              key={product.path}
              to={product.path}
              className={`block p-4 rounded-lg border transition-colors ${
                isDark 
                  ? "bg-gray-900/50 border-gray-800 hover:border-gray-700" 
                  : "bg-gray-50 border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {product.title}
                  </h3>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {product.description}
                  </p>
                </div>
                <ArrowRight className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="subscription" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Subscription
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          ManiFed Fintech requires a subscription to access. Subscriptions can be purchased with mana 
          and provide access to all Fintech tools.
        </p>
        <Link 
          to="/fintech"
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isDark 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          Subscribe Now
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </DocsPage>
  );
}
