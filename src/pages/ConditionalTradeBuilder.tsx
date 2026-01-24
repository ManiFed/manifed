import { useState, useEffect } from "react";
import { UniversalHeader } from "@/components/layout/UniversalHeader";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Workflow,
  Plus,
  Trash2,
  Play,
  Pause,
  Settings,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  Zap,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Save,
  Copy,
} from "lucide-react";

interface Condition {
  id: string;
  type: "price" | "volume" | "time" | "probability";
  operator: "gt" | "lt" | "eq" | "gte" | "lte";
  value: number;
  marketId?: string;
  marketQuestion?: string;
}

interface Action {
  id: string;
  type: "buy_yes" | "buy_no" | "sell" | "alert";
  marketId: string;
  marketQuestion: string;
  amount: number;
}

interface TradeRule {
  id: string;
  name: string;
  description: string;
  conditions: Condition[];
  conditionLogic: "AND" | "OR";
  actions: Action[];
  isActive: boolean;
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
}

export default function ConditionalTradeBuilder() {
  const [rules, setRules] = useState<TradeRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");

  // Builder state
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [conditionLogic, setConditionLogic] = useState<"AND" | "OR">("AND");
  const [actions, setActions] = useState<Action[]>([]);
  const [marketSearch, setMarketSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingRule, setEditingRule] = useState<TradeRule | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("conditional_trade_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsedRules = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || "",
        conditions: r.conditions || [],
        conditionLogic: r.condition_logic || "AND",
        actions: r.actions || [],
        isActive: r.is_active,
        lastTriggered: r.last_triggered,
        triggerCount: r.trigger_count || 0,
        createdAt: r.created_at,
      }));

      setRules(parsedRules);
    } catch (error) {
      console.error("Error loading rules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchMarkets = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.manifold.markets/v0/search-markets?term=${encodeURIComponent(query)}&limit=10`
      );
      const data = await response.json();
      setSearchResults(data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const addCondition = () => {
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      type: "probability",
      operator: "gt",
      value: 50,
    };
    setConditions([...conditions, newCondition]);
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const addAction = () => {
    const newAction: Action = {
      id: crypto.randomUUID(),
      type: "buy_yes",
      marketId: "",
      marketQuestion: "",
      amount: 10,
    };
    setActions([...actions, newAction]);
  };

  const updateAction = (id: string, updates: Partial<Action>) => {
    setActions(actions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const saveRule = async () => {
    if (!ruleName.trim()) {
      toast({ title: "Please enter a rule name", variant: "destructive" });
      return;
    }
    if (conditions.length === 0) {
      toast({ title: "Add at least one condition", variant: "destructive" });
      return;
    }
    if (actions.length === 0) {
      toast({ title: "Add at least one action", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ruleData = {
        user_id: user.id,
        name: ruleName,
        description: ruleDescription,
        conditions: JSON.parse(JSON.stringify(conditions)),
        condition_logic: conditionLogic,
        actions: JSON.parse(JSON.stringify(actions)),
        is_active: true,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("conditional_trade_rules")
          .update(ruleData)
          .eq("id", editingRule.id);
        if (error) throw error;
        toast({ title: "Rule Updated" });
      } else {
        const { error } = await supabase
          .from("conditional_trade_rules")
          .insert(ruleData);
        if (error) throw error;
        toast({ title: "Rule Created" });
      }

      resetBuilder();
      loadRules();
      setActiveTab("rules");
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Failed to save rule",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRule = async (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;

    try {
      const { error } = await supabase
        .from("conditional_trade_rules")
        .update({ is_active: !rule.isActive })
        .eq("id", ruleId);

      if (error) throw error;

      setRules(
        rules.map((r) =>
          r.id === ruleId ? { ...r, isActive: !r.isActive } : r
        )
      );

      toast({
        title: rule.isActive ? "Rule Paused" : "Rule Activated",
      });
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from("conditional_trade_rules")
        .delete()
        .eq("id", ruleId);

      if (error) throw error;

      setRules(rules.filter((r) => r.id !== ruleId));
      toast({ title: "Rule Deleted" });
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const editRule = (rule: TradeRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description);
    setConditions(rule.conditions);
    setConditionLogic(rule.conditionLogic);
    setActions(rule.actions);
    setActiveTab("builder");
  };

  const resetBuilder = () => {
    setEditingRule(null);
    setRuleName("");
    setRuleDescription("");
    setConditions([]);
    setConditionLogic("AND");
    setActions([]);
  };

  const duplicateRule = (rule: TradeRule) => {
    setRuleName(`${rule.name} (Copy)`);
    setRuleDescription(rule.description);
    setConditions(rule.conditions.map((c) => ({ ...c, id: crypto.randomUUID() })));
    setConditionLogic(rule.conditionLogic);
    setActions(rule.actions.map((a) => ({ ...a, id: crypto.randomUUID() })));
    setEditingRule(null);
    setActiveTab("builder");
  };

  const getOperatorLabel = (op: string) => {
    const labels: Record<string, string> = {
      gt: ">",
      lt: "<",
      eq: "=",
      gte: "≥",
      lte: "≤",
    };
    return labels[op] || op;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Workflow className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Conditional Trade Builder</h1>
              <p className="text-muted-foreground">
                Create automated trading rules with multi-condition triggers
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="builder" className="gap-2">
              <Zap className="w-4 h-4" />
              Rule Builder
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Activity className="w-4 h-4" />
              My Rules
              {rules.length > 0 && (
                <Badge variant="secondary">{rules.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left: Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-400" />
                    Conditions
                  </CardTitle>
                  <CardDescription>
                    Define when this rule should trigger
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logic Selector */}
                  {conditions.length > 1 && (
                    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm">Match:</span>
                      <Select
                        value={conditionLogic}
                        onValueChange={(v) => setConditionLogic(v as "AND" | "OR")}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">ALL conditions</SelectItem>
                          <SelectItem value="OR">ANY condition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Conditions List */}
                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <div key={condition.id} className="flex items-center gap-2">
                        {index > 0 && (
                          <Badge variant="outline" className="shrink-0">
                            {conditionLogic}
                          </Badge>
                        )}
                        <Select
                          value={condition.type}
                          onValueChange={(v) =>
                            updateCondition(condition.id, { type: v as any })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="probability">Probability</SelectItem>
                            <SelectItem value="price">Price</SelectItem>
                            <SelectItem value="volume">Volume</SelectItem>
                            <SelectItem value="time">Time</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={condition.operator}
                          onValueChange={(v) =>
                            updateCondition(condition.id, { operator: v as any })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gt">&gt;</SelectItem>
                            <SelectItem value="lt">&lt;</SelectItem>
                            <SelectItem value="eq">=</SelectItem>
                            <SelectItem value="gte">≥</SelectItem>
                            <SelectItem value="lte">≤</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={condition.value}
                          onChange={(e) =>
                            updateCondition(condition.id, {
                              value: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          {condition.type === "probability" && "%"}
                          {condition.type === "volume" && "M$"}
                          {condition.type === "time" && "hrs"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(condition.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" onClick={addCondition} className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Add Condition
                  </Button>
                </CardContent>
              </Card>

              {/* Right: Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    Actions
                  </CardTitle>
                  <CardDescription>
                    What should happen when conditions are met
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Market Search */}
                  <div>
                    <Label>Search Market</Label>
                    <div className="relative mt-1">
                      <Input
                        placeholder="Search for a market..."
                        value={marketSearch}
                        onChange={(e) => {
                          setMarketSearch(e.target.value);
                          searchMarkets(e.target.value);
                        }}
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                      )}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-40 overflow-auto">
                        {searchResults.map((market) => (
                          <button
                            key={market.id}
                            className="w-full p-2 text-left text-sm hover:bg-muted transition-colors"
                            onClick={() => {
                              if (actions.length === 0) addAction();
                              const lastAction = actions[actions.length - 1] || {
                                id: crypto.randomUUID(),
                                type: "buy_yes",
                                amount: 10,
                              };
                              updateAction(lastAction.id, {
                                marketId: market.id,
                                marketQuestion: market.question,
                              });
                              setMarketSearch("");
                              setSearchResults([]);
                            }}
                          >
                            <span className="line-clamp-1">{market.question}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions List */}
                  <div className="space-y-3">
                    {actions.map((action) => (
                      <div key={action.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={action.type}
                            onValueChange={(v) =>
                              updateAction(action.id, { type: v as any })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="buy_yes">Buy YES</SelectItem>
                              <SelectItem value="buy_no">Buy NO</SelectItem>
                              <SelectItem value="sell">Sell</SelectItem>
                              <SelectItem value="alert">Alert Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={action.amount}
                            onChange={(e) =>
                              updateAction(action.id, {
                                amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">M$</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAction(action.id)}
                            className="ml-auto"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        {action.marketQuestion && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {action.marketQuestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" onClick={addAction} className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Add Action
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Save Section */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Rule name..."
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                    />
                    <Input
                      placeholder="Description (optional)..."
                      value={ruleDescription}
                      onChange={(e) => setRuleDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    {editingRule && (
                      <Button variant="outline" onClick={resetBuilder}>
                        Cancel
                      </Button>
                    )}
                    <Button onClick={saveRule} disabled={isSaving} className="gap-2">
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {editingRule ? "Update Rule" : "Save Rule"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules">
            {rules.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Workflow className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Rules Created</h3>
                  <p className="text-muted-foreground mb-4">
                    Use the Rule Builder to create your first automated trading rule
                  </p>
                  <Button onClick={() => setActiveTab("builder")}>
                    Create Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{rule.name}</h3>
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? (
                                <>
                                  <Play className="w-3 h-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Pause className="w-3 h-3 mr-1" />
                                  Paused
                                </>
                              )}
                            </Badge>
                            {rule.triggerCount > 0 && (
                              <Badge variant="outline">
                                {rule.triggerCount} triggers
                              </Badge>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {rule.description}
                            </p>
                          )}

                          {/* Conditions Summary */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">IF:</span>
                            {rule.conditions.map((c, i) => (
                              <Badge key={c.id} variant="outline" className="text-xs">
                                {i > 0 && <span className="mr-1">{rule.conditionLogic}</span>}
                                {c.type} {getOperatorLabel(c.operator)} {c.value}
                                {c.type === "probability" && "%"}
                              </Badge>
                            ))}
                          </div>

                          {/* Actions Summary */}
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground">THEN:</span>
                            {rule.actions.map((a) => (
                              <Badge
                                key={a.id}
                                variant={a.type.includes("yes") ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {a.type.replace("_", " ")} M${a.amount}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateRule(rule)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editRule(rule)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => toggleRule(rule.id)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
