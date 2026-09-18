INSERT INTO menu_items (key, label, path, icon, sort_order, is_active)
VALUES ('notifications', 'Notifications', '/notifications', 'bell', 970, FALSE)
ON CONFLICT (key) DO NOTHING;
