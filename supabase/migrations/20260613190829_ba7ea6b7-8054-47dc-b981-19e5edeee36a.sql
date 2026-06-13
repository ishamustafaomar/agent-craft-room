ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE TABLE public.project_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Snapshot',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_snapshots_project ON public.project_snapshots (project_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_snapshots TO authenticated;
GRANT ALL ON public.project_snapshots TO service_role;

ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage snapshots of their own projects"
  ON public.project_snapshots
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_snapshots.project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_snapshots.project_id AND p.user_id = auth.uid()));