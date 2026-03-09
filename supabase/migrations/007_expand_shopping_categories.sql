-- Expand shopping categories: add טיפוח, תרופות, תינוק
-- Drop existing CHECK constraint if it exists (migration.sql had one, 003 doesn't)
DO $$ BEGIN
  ALTER TABLE public.shopping_items DROP CONSTRAINT IF EXISTS shopping_items_category_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
