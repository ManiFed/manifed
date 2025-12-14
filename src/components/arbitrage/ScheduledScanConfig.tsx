import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Clock, Mail, Calendar, Trash2, Loader2, Play, Pause } from 'lucide-react';

interface Schedule {
  id: string;
  cron_expression: string;
  is_active: boolean;
  email_on_opportunities: boolean;
  email_on_completion: boolean;
  min_opportunity_threshold: number;
  scan_config: any;
  last_run_at: string | null;
  next_run_at: string | null;
}

const FREQUENCY_OPTIONS = [
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 */12 * * *', label: 'Every 12 hours' },
  { value: '0 9 * * *', label: 'Daily at 9 AM' },
  { value: '0 9,21 * * *', label: 'Twice daily (9 AM, 9 PM)' },
  { value: '0 9 * * 1-5', label: 'Weekdays at 9 AM' },
];

export function ScheduledScanConfig() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // New schedule form
  const [cronExpression, setCronExpression] = useState('0 */6 * * *');
  const [emailOnOpportunities, setEmailOnOpportunities] = useState(true);
  const [emailOnCompletion, setEmailOnCompletion] = useState(false);
  const [minThreshold, setMinThreshold] = useState(3);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('arbitrage_scan_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createSchedule = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('arbitrage_scan_schedules')
        .insert({
          user_id: user.id,
          cron_expression: cronExpression,
          is_active: true,
          email_on_opportunities: emailOnOpportunities,
          email_on_completion: emailOnCompletion,
          min_opportunity_threshold: minThreshold / 100,
          scan_config: {
            minLiquidity: 50,
            minVolume: 10,
            baseThreshold: 0.02,
          },
        });

      if (error) throw error;

      toast({ title: 'Schedule Created', description: 'Your recurring scan has been scheduled.' });
      fetchSchedules();
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to create schedule',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSchedule = async (scheduleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('arbitrage_scan_schedules')
        .update({ is_active: !isActive })
        .eq('id', scheduleId);

      if (error) throw error;

      setSchedules(prev => prev.map(s => 
        s.id === scheduleId ? { ...s, is_active: !isActive } : s
      ));

      toast({ 
        title: isActive ? 'Schedule Paused' : 'Schedule Activated',
        description: isActive ? 'Recurring scans are paused.' : 'Recurring scans will run on schedule.'
      });
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('arbitrage_scan_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      toast({ title: 'Schedule Deleted' });
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const getFrequencyLabel = (cron: string) => {
    const option = FREQUENCY_OPTIONS.find(o => o.value === cron);
    return option?.label || cron;
  };

  if (isLoading) {
    return (
      <Card className="bg-secondary/20 border-border/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary/20 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Scheduled Scans
        </CardTitle>
        <CardDescription>
          Set up recurring arbitrage scans with email notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Schedules */}
        {schedules.length > 0 && (
          <div className="space-y-2">
            {schedules.map(schedule => (
              <div 
                key={schedule.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${schedule.is_active ? 'bg-primary/20' : 'bg-muted'}`}>
                    <Clock className={`w-4 h-4 ${schedule.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{getFrequencyLabel(schedule.cron_expression)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {schedule.email_on_opportunities && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Mail className="w-3 h-3" />
                          Opportunities
                        </Badge>
                      )}
                      {schedule.email_on_completion && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Mail className="w-3 h-3" />
                          Completion
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={schedule.is_active ? 'success' : 'secondary'}>
                    {schedule.is_active ? 'Active' : 'Paused'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSchedule(schedule.id, schedule.is_active)}
                  >
                    {schedule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSchedule(schedule.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create New Schedule */}
        <div className="border-t border-border/30 pt-4 space-y-4">
          <h4 className="text-sm font-medium">Create New Schedule</h4>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={cronExpression} onValueChange={setCronExpression}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Min Profit Threshold (%)</Label>
              <Input
                type="number"
                value={minThreshold}
                onChange={e => setMinThreshold(Number(e.target.value))}
                min={1}
                max={20}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="email-opps"
                checked={emailOnOpportunities}
                onCheckedChange={setEmailOnOpportunities}
              />
              <Label htmlFor="email-opps" className="text-sm">
                Email when opportunities found
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="email-complete"
                checked={emailOnCompletion}
                onCheckedChange={setEmailOnCompletion}
              />
              <Label htmlFor="email-complete" className="text-sm">
                Email on scan completion
              </Label>
            </div>
          </div>

          <Button 
            onClick={createSchedule} 
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
