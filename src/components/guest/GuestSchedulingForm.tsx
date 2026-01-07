import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { format, addDays, isBefore, addHours, setHours, setMinutes } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GuestSchedulingFormProps {
  collaborationId: string;
  workspaceId: string;
  existingSchedule?: {
    scheduled_date: string | null;
    prep_date: string | null;
    reschedule_count: number;
  };
  onComplete: () => void;
  isRescheduling?: boolean;
}

interface WorkspaceSettings {
  max_reschedules: number;
  reschedule_cutoff_hours: number;
}

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00"
];

export default function GuestSchedulingForm({
  collaborationId,
  workspaceId,
  existingSchedule,
  onComplete,
  isRescheduling = false,
}: GuestSchedulingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings | null>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [wantsPrepSession, setWantsPrepSession] = useState(false);
  const [prepDate, setPrepDate] = useState<Date | undefined>(undefined);
  const [prepTime, setPrepTime] = useState<string>("");

  // Reschedule validation
  const [canReschedule, setCanReschedule] = useState(true);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspaceSettings() {
      const { data } = await supabase
        .from("workspaces")
        .select("max_reschedules, reschedule_cutoff_hours")
        .eq("id", workspaceId)
        .single();

      if (data) {
        setWorkspaceSettings(data);
        validateReschedule(data);
      }
    }

    loadWorkspaceSettings();
  }, [workspaceId]);

  function validateReschedule(settings: WorkspaceSettings) {
    if (!isRescheduling || !existingSchedule) return;

    const rescheduleCount = existingSchedule.reschedule_count || 0;
    
    // Check max reschedules
    if (rescheduleCount >= settings.max_reschedules) {
      setCanReschedule(false);
      setRescheduleError(`Maximum reschedules (${settings.max_reschedules}) reached. Please contact the host.`);
      return;
    }

    // Check cutoff hours
    if (existingSchedule.scheduled_date) {
      const scheduledDate = new Date(existingSchedule.scheduled_date);
      const cutoffTime = addHours(new Date(), settings.reschedule_cutoff_hours);
      
      if (isBefore(scheduledDate, cutoffTime)) {
        setCanReschedule(false);
        setRescheduleError(
          `Cannot reschedule within ${settings.reschedule_cutoff_hours} hours of the recording. Please contact the host.`
        );
        return;
      }
    }

    setCanReschedule(true);
    setRescheduleError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Please select a date and time",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const scheduledDateTime = setMinutes(setHours(selectedDate, hours), minutes);

      let prepDateTime: Date | null = null;
      if (wantsPrepSession && prepDate && prepTime) {
        const [prepHours, prepMinutes] = prepTime.split(":").map(Number);
        prepDateTime = setMinutes(setHours(prepDate, prepHours), prepMinutes);
      }

      const updateData: Record<string, unknown> = {
        scheduled_date: scheduledDateTime.toISOString(),
        prep_date: prepDateTime?.toISOString() || null,
        status: "scheduled" as const,
      };

      // Increment reschedule count if rescheduling
      if (isRescheduling) {
        updateData.reschedule_count = (existingSchedule?.reschedule_count || 0) + 1;
      }

      const { error } = await supabase
        .from("collaborations")
        .update(updateData)
        .eq("id", collaborationId);

      if (error) throw error;

      toast({
        title: isRescheduling ? "Session rescheduled!" : "Session scheduled!",
        description: `Recording scheduled for ${format(scheduledDateTime, "EEEE, MMMM d 'at' h:mm a")}`,
      });

      onComplete();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to schedule session";
      toast({
        title: "Error scheduling session",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Disable past dates
  const disabledDays = { before: addDays(new Date(), 1) };

  if (isRescheduling && !canReschedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Cannot Reschedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{rescheduleError}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isRescheduling ? (
            <>
              <RefreshCw className="h-5 w-5" />
              Reschedule Your Recording
            </>
          ) : (
            <>
              <CalendarIcon className="h-5 w-5" />
              Schedule Your Recording
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isRescheduling
            ? `You have ${(workspaceSettings?.max_reschedules || 2) - (existingSchedule?.reschedule_count || 0)} reschedule(s) remaining.`
            : "Select a date and time that works best for you."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recording Date & Time */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Recording Date & Time *</Label>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={disabledDays}
                  className="rounded-md border"
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Select Time
                  </Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {format(
                            setMinutes(setHours(new Date(), parseInt(time.split(":")[0])), parseInt(time.split(":")[1])),
                            "h:mm a"
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDate && selectedTime && (
                  <div className="rounded-md bg-accent p-3">
                    <p className="text-sm font-medium text-accent-foreground">
                      Selected: {format(selectedDate, "EEEE, MMMM d, yyyy")} at{" "}
                      {format(
                        setMinutes(setHours(new Date(), parseInt(selectedTime.split(":")[0])), parseInt(selectedTime.split(":")[1])),
                        "h:mm a"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prep Session Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Optional Prep Session</Label>
              <p className="text-sm text-muted-foreground">
                Schedule a brief call before the recording to align on topics
              </p>
            </div>
            <Switch
              checked={wantsPrepSession}
              onCheckedChange={setWantsPrepSession}
            />
          </div>

          {/* Prep Session Date & Time */}
          {wantsPrepSession && (
            <div className="space-y-4 rounded-lg border p-4">
              <Label className="text-base font-medium">Prep Session Date & Time</Label>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={prepDate}
                    onSelect={setPrepDate}
                    disabled={disabledDays}
                    className="rounded-md border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Select Time
                  </Label>
                  <Select value={prepTime} onValueChange={setPrepTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((time) => (
                        <SelectItem key={time} value={time}>
                          {format(
                            setMinutes(setHours(new Date(), parseInt(time.split(":")[0])), parseInt(time.split(":")[1])),
                            "h:mm a"
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {prepDate && prepTime && (
                    <div className="rounded-md bg-accent p-3 mt-4">
                      <p className="text-sm font-medium text-accent-foreground">
                        Prep: {format(prepDate, "EEEE, MMMM d")} at{" "}
                        {format(
                          setMinutes(setHours(new Date(), parseInt(prepTime.split(":")[0])), parseInt(prepTime.split(":")[1])),
                          "h:mm a"
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !selectedDate || !selectedTime}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRescheduling ? "Confirm Reschedule" : "Confirm Schedule"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}