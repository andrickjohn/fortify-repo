-- Cleanup script to remove extraneous districts
-- Keeping: Orange Unified School District (ea9fd3ca-a56e-4959-bb79-201cc8d70450)
-- Removing all others.

DELETE FROM districts 
WHERE id NOT IN ('ea9fd3ca-a56e-4959-bb79-201cc8d70450');

-- Verify only one remains
SELECT id, name FROM districts;
