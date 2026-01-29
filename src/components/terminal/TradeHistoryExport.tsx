import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface TradeHistoryExportProps {
  apiKey: string;
}

export function TradeHistoryExport({ apiKey }: TradeHistoryExportProps) {
  const [exporting, setExporting] = useState(false);

  const exportTradeHistory = async () => {
    if (!apiKey) {
      toast.error("API key required for export");
      return;
    }

    setExporting(true);
    try {
      // Fetch user's bets from Manifold API
      const response = await fetch(
        `https://api.manifold.markets/v0/bets?limit=1000`,
        {
          headers: {
            Authorization: `Key ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch trade history");
      }

      const bets = await response.json();

      if (bets.length === 0) {
        toast.info("No trades found to export");
        setExporting(false);
        return;
      }

      // Format data for CSV
      const csvHeaders = [
        "Date",
        "Time",
        "Market ID",
        "Outcome",
        "Amount (M$)",
        "Shares",
        "Probability Before",
        "Probability After",
        "Order Type",
        "Limit Price",
        "Is Filled",
      ];

      const csvRows = bets.map((bet: any) => {
        const date = new Date(bet.createdTime);
        const isLimit = bet.limitProb !== undefined && bet.limitProb !== null;
        
        return [
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
          bet.contractId,
          bet.outcome,
          Math.abs(bet.amount).toFixed(2),
          bet.shares?.toFixed(2) || "0",
          (bet.probBefore * 100).toFixed(1) + "%",
          (bet.probAfter * 100).toFixed(1) + "%",
          isLimit ? "LIMIT" : "MARKET",
          isLimit ? (bet.limitProb * 100).toFixed(1) + "%" : "-",
          bet.isFilled !== undefined ? (bet.isFilled ? "Yes" : "Partial") : "-",
        ];
      });

      // Create CSV content
      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map((row: string[]) =>
          row.map((cell) => `"${cell}"`).join(",")
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `manifold-trades-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${bets.length} trades to CSV`);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export trade history");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportTradeHistory}
      disabled={exporting || !apiKey}
      className="border-gray-700 text-gray-400 hover:text-white gap-2"
    >
      <Download className="h-3 w-3" />
      {exporting ? "Exporting..." : "Export Trades"}
    </Button>
  );
}
