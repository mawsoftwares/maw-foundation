-- The sample Notifications page was a leftover channel tester superseded by
-- Messaging. Remove the seeded sidebar item; the in-app notifications table
-- and API remain.
DELETE FROM menu_items WHERE key = 'notifications';
