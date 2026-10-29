-- No purple pen any more (see V20261022_01): swap the 'k' variants too.
--   130-134 mm (id 7)  : ik -> pk
--   155-159 mm (id 12) : pk -> ik
-- Existing barcodes / books are NOT touched.
-- Idempotent: only swaps while id 7 is still 'ik' and id 12 still 'pk'
-- (it was applied by hand in DBeaver first).

UPDATE public.size_rules SET name = '__tmp__' WHERE id = 7 AND name = 'ik';
UPDATE public.size_rules SET name = 'ik' WHERE id = 12 AND name = 'pk'
  AND EXISTS (SELECT 1 FROM public.size_rules WHERE id = 7 AND name = '__tmp__');
UPDATE public.size_rules SET name = 'pk' WHERE id = 7 AND name = '__tmp__';
