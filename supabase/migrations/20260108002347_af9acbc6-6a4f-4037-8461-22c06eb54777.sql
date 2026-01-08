-- Create table for collaboration status history
CREATE TABLE public.collaboration_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  old_status public.collaboration_status,
  new_status public.collaboration_status NOT NULL,
  changed_by_user_id UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.collaboration_status_history ENABLE ROW LEVEL SECURITY;

-- Users can view history for collaborations they have access to
CREATE POLICY "Users can view status history for their collaborations"
ON public.collaboration_status_history
FOR SELECT
USING (can_access_collaboration(auth.uid(), collaboration_id));

-- Allow inserts from collaboration updates (via trigger)
CREATE POLICY "System can insert status history"
ON public.collaboration_status_history
FOR INSERT
WITH CHECK (can_access_collaboration(auth.uid(), collaboration_id));

-- Create trigger function to log status changes
CREATE OR REPLACE FUNCTION public.log_collaboration_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.collaboration_status_history (
      collaboration_id,
      old_status,
      new_status,
      changed_by_user_id
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on collaborations table
CREATE TRIGGER on_collaboration_status_change
AFTER UPDATE ON public.collaborations
FOR EACH ROW
EXECUTE FUNCTION public.log_collaboration_status_change();

-- Create index for faster lookups
CREATE INDEX idx_status_history_collaboration ON public.collaboration_status_history(collaboration_id);