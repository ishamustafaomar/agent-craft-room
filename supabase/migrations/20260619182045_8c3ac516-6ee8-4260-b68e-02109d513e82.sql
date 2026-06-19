ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_key ON public.projects (slug) WHERE slug IS NOT NULL;