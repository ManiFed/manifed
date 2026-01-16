import DocsPage from "../DocsPage";
import { useOutletContext, Link } from "react-router-dom";
import { ArrowRight, Shield, TrendingUp, Clock } from "lucide-react";

export function TreasuryOverviewDoc() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage
      title="ManiFed Treasury"
      description="Earn guaranteed returns with ManiFed Treasury bonds."
      tableOfContents={[
        { id: "overview", label: "Overview" },
        { id: "how-it-works", label: "How It Works" },
        { id: "products", label: "Products" },
        { id: "risks", label: "Risks" },
      ]}
    >
      <section id="overview" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Overview
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          ManiFed Treasury offers fixed-income investment products for mana. Unlike prediction markets 
          where returns depend on outcomes, Treasury bonds provide guaranteed yields over fixed terms.
        </p>
        <div className="grid gap-4 mt-6">
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <Shield className={`w-5 h-5 mt-0.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
            <div>
              <h3 className={`font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Low Risk</h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Guaranteed returns backed by the ManiFed treasury reserve.
              </p>
            </div>
          </div>
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <TrendingUp className={`w-5 h-5 mt-0.5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            <div>
              <h3 className={`font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Steady Yields</h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Earn monthly interest payments plus principal at maturity.
              </p>
            </div>
          </div>
          <div className={`flex items-start gap-3 p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
            <Clock className={`w-5 h-5 mt-0.5 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
            <div>
              <h3 className={`font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Flexible Terms</h3>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Choose from various term lengths to match your investment horizon.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          How It Works
        </h2>
        <ol className={`list-decimal list-inside space-y-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li><strong>Purchase:</strong> Buy a bond with mana, selecting your preferred term length</li>
          <li><strong>Interest:</strong> Receive monthly interest payments directly to your balance</li>
          <li><strong>Maturity:</strong> Get your full principal back when the bond matures</li>
          <li><strong>Trade:</strong> Optionally sell bonds on the secondary market before maturity</li>
        </ol>
      </section>

      <section id="products" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Products
        </h2>
        <div className="grid gap-4">
          <Link
            to="/docs/bonds"
            className={`block p-4 rounded-lg border transition-colors ${
              isDark 
                ? "bg-gray-900/50 border-gray-800 hover:border-gray-700" 
                : "bg-gray-50 border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Treasury Bonds</h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Primary market bonds with fixed terms and guaranteed yields.
                </p>
              </div>
              <ArrowRight className={`w-4 h-4 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
            </div>
          </Link>
          <Link
            to="/docs/bond-market"
            className={`block p-4 rounded-lg border transition-colors ${
              isDark 
                ? "bg-gray-900/50 border-gray-800 hover:border-gray-700" 
                : "bg-gray-50 border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Bond Market</h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Secondary market for trading existing bonds.
                </p>
              </div>
              <ArrowRight className={`w-4 h-4 ${isDark ? "text-gray-600" : "text-gray-400"}`} />
            </div>
          </Link>
        </div>
      </section>

      <section id="risks" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Risks
        </h2>
        <div className={`p-4 rounded-lg border ${isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"}`}>
          <p className={`text-sm ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
            While Treasury bonds are designed to be low-risk, they are not guaranteed by any government or 
            insurance. Returns depend on the continued operation of ManiFed and its treasury reserves. 
            Only invest mana you can afford to have locked for the bond term.
          </p>
        </div>
      </section>
    </DocsPage>
  );
}

export function BondsDoc() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage
      title="Treasury Bonds"
      description="Purchase bonds directly from the ManiFed Treasury."
      breadcrumb="ManiFed Treasury"
      tableOfContents={[
        { id: "purchasing", label: "Purchasing Bonds" },
        { id: "terms", label: "Available Terms" },
        { id: "interest", label: "Interest Payments" },
        { id: "maturity", label: "Maturity" },
      ]}
    >
      <section id="purchasing" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Purchasing Bonds
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          To purchase a Treasury bond:
        </p>
        <ol className={`list-decimal list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Navigate to the <Link to="/bonds" className="text-blue-500 hover:underline">Bonds page</Link></li>
          <li>Select a term length (longer terms = higher yields)</li>
          <li>Enter the amount of mana to invest</li>
          <li>Review the projected returns and confirm purchase</li>
        </ol>
      </section>

      <section id="terms" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Available Terms
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Bonds are available in various term lengths. Longer terms offer higher annual yields to compensate for reduced liquidity.
        </p>
        <div className={`p-4 rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Current rates are displayed on the Bonds page and may change for new purchases.
          </p>
        </div>
      </section>

      <section id="interest" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Interest Payments
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Interest is paid monthly on the anniversary of your bond purchase. Payments are automatically 
          credited to your ManiFed balance. You can see upcoming payment dates and amounts in your portfolio.
        </p>
      </section>

      <section id="maturity" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Maturity
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          When your bond matures, the full principal amount is returned to your balance automatically. 
          You'll receive a notification when maturity occurs. After maturity, the bond is removed from 
          your portfolio.
        </p>
      </section>
    </DocsPage>
  );
}

export function BondMarketDoc() {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage
      title="Bond Market"
      description="Trade existing bonds on the secondary market."
      breadcrumb="ManiFed Treasury"
      tableOfContents={[
        { id: "overview", label: "Overview" },
        { id: "selling", label: "Selling Bonds" },
        { id: "buying", label: "Buying Bonds" },
        { id: "pricing", label: "Pricing" },
      ]}
    >
      <section id="overview" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Overview
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          The Bond Market allows holders to sell bonds before maturity, and buyers to acquire bonds 
          at potentially discounted prices. This provides liquidity for bondholders who need their 
          mana before the original maturity date.
        </p>
      </section>

      <section id="selling" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Selling Bonds
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          To list a bond for sale:
        </p>
        <ol className={`list-decimal list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Go to your Portfolio and find the bond</li>
          <li>Click "List for Sale"</li>
          <li>Set your asking price</li>
          <li>Wait for a buyer to purchase</li>
        </ol>
        <div className={`mt-4 p-4 rounded-lg border ${isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
          <p className={`text-sm ${isDark ? "text-blue-400" : "text-blue-700"}`}>
            <strong>Tip:</strong> Bonds closer to maturity typically sell for prices closer to face value plus remaining interest.
          </p>
        </div>
      </section>

      <section id="buying" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Buying Bonds
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Browse listed bonds on the <Link to="/bond-market" className="text-blue-500 hover:underline">Bond Market page</Link>. 
          Each listing shows the face value, remaining term, and asking price. You'll receive all 
          future interest payments plus the principal at maturity.
        </p>
      </section>

      <section id="pricing" className="mb-12">
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Pricing
        </h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          Bond prices on the secondary market are set by sellers. A fair price typically reflects:
        </p>
        <ul className={`list-disc list-inside space-y-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          <li>Original principal amount</li>
          <li>Remaining interest payments until maturity</li>
          <li>Time value of mana (longer wait = lower price)</li>
          <li>Current market demand</li>
        </ul>
      </section>
    </DocsPage>
  );
}
