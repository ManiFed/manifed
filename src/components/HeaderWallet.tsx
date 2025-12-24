import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Wallet, Plus, Minus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { DepositPopup } from "./DepositPopup";

interface HeaderWalletProps {
  balance: number;
  onBalanceChange: () => void;
}

export function HeaderWallet({ balance, hasApiKey, onBalanceChange }: HeaderWalletProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDepositPopup, setShowDepositPopup] = useState(false);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<"select" | "withdraw">("select");
  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 10) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal is M$10",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You cannot withdraw more than your available balance",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("managram", {
        body: {
          action: "withdraw",
          amount: withdrawAmount,
          message: `Withdrawl from ManiFed account - M$${withdrawAmount}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      onBalanceChange();
      setAmount("");
      setMode("select");
      setIsOpen(false);

      toast({
        title: "Withdrawal Successful",
        description: `M$${withdrawAmount.toLocaleString()} sent to your Manifold wallet`,
      });
    } catch (error) {
      console.error("Withdraw error:", error);
      toast({
        title: "Withdrawal Failed",
        description:
          error instanceof Error ? error.message : "Failed to process withdrawal. The Deep State is at it again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setMode("select");
            setAmount("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary/70 transition-colors cursor-pointer">
            <Wallet className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold">M${balance.toLocaleString()}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="end">
          {mode === "select" ? (
            <div className="space-y-3">
              <div className="text-center pb-2 border-b border-border/50">
                <p className="text-xs text-muted-foreground">ManiFed Balance</p>
                <p className="text-2xl font-bold text-foreground">M${balance.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setShowDepositPopup(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Deposit
                </Button>
                <Button variant="outline" onClick={() => setMode("withdraw")} className="gap-2" disabled={!hasApiKey}>
                  <Minus className="w-4 h-4" />
                  Withdraw
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">Minimum transaction: M$10</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Withdraw M$</h4>
                <Button variant="ghost" size="sm" onClick={() => setMode("select")}>
                  Back
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-secondary/50 flex-1"
                  min={10}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(Math.floor(balance).toString())}
                  className="px-3"
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Available: M${balance.toLocaleString()}</p>
              <Button variant="glow" className="w-full" onClick={handleWithdraw} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Withdraw
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <DepositPopup open={showDepositPopup} onOpenChange={setShowDepositPopup} />
    </>
  );
}
