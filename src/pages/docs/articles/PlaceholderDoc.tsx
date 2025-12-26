import DocsPage from "../DocsPage";
import { useOutletContext, useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

// Generic placeholder for documentation pages not yet written
export default function PlaceholderDoc({ title, breadcrumb }: { title: string; breadcrumb?: string }) {
  const { isDark } = useOutletContext<{ isDark: boolean }>();

  return (
    <DocsPage title={title} breadcrumb={breadcrumb}>
      <div className={`text-center py-16 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        <Construction className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-medium mb-2">Documentation Coming Soon</h2>
        <p className="text-sm">This documentation page is under construction.</p>
      </div>
    </DocsPage>
  );
}

// Export specific placeholder components
export function QuickstartDoc() {
  return <PlaceholderDoc title="Quickstart" />;
}

export function CoreConceptsDoc() {
  return <PlaceholderDoc title="Core Concepts" />;
}

export function CreateAccountDoc() {
  return <PlaceholderDoc title="Create Account" breadcrumb="Account Setup" />;
}

export function ManifoldIntegrationDoc() {
  return <PlaceholderDoc title="Manifold Integration" breadcrumb="Account Setup" />;
}

export function DepositsWithdrawalsDoc() {
  return <PlaceholderDoc title="Deposits & Withdrawals" breadcrumb="Account Setup" />;
}

export function IndexFundsDoc() {
  return <PlaceholderDoc title="Index Funds" breadcrumb="ManiFed Fintech" />;
}

export function AdvancedOrdersDoc() {
  return <PlaceholderDoc title="Advanced Orders" breadcrumb="ManiFed Fintech" />;
}

export function CalibrationDoc() {
  return <PlaceholderDoc title="Calibration Analysis" breadcrumb="ManiFed Fintech" />;
}

export function BotBuilderDoc() {
  return <PlaceholderDoc title="Bot Builder" breadcrumb="ManiFed Fintech" />;
}

export function ArbitrageDoc() {
  return <PlaceholderDoc title="AI Arbitrage Scanner" breadcrumb="ManiFed Fintech" />;
}

export function TreasuryOverviewDoc() {
  return <PlaceholderDoc title="ManiFed Treasury" />;
}

export function BondsDoc() {
  return <PlaceholderDoc title="Bonds" breadcrumb="ManiFed Treasury" />;
}

export function BondMarketDoc() {
  return <PlaceholderDoc title="Bond Market" breadcrumb="ManiFed Treasury" />;
}

export function MemecoinsDoc() {
  return <PlaceholderDoc title="Memecoins" breadcrumb="Other Products" />;
}

export function CommentMakerDoc() {
  return <PlaceholderDoc title="Comment Maker" breadcrumb="Other Products" />;
}

export function FirstTradeDoc() {
  return <PlaceholderDoc title="Your First Trade" breadcrumb="Trading Guides" />;
}

export function LimitOrdersDoc() {
  return <PlaceholderDoc title="Using Limit Orders" breadcrumb="Trading Guides" />;
}

export function HotkeysDoc() {
  return <PlaceholderDoc title="Setting Up Hotkeys" breadcrumb="Trading Guides" />;
}

export function ArbitrageGuideDoc() {
  return <PlaceholderDoc title="Finding Arbitrage" breadcrumb="Strategy" />;
}

export function CalibrationGuideDoc() {
  return <PlaceholderDoc title="Improving Calibration" breadcrumb="Strategy" />;
}

export function ApiOverviewDoc() {
  return <PlaceholderDoc title="API Overview" breadcrumb="API Reference" />;
}

export function ApiAuthDoc() {
  return <PlaceholderDoc title="Authentication" breadcrumb="API Reference" />;
}
