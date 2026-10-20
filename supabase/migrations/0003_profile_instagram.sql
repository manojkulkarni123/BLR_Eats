-- The map owner's Instagram username, shown as a button on their map.
alter table public.profiles add column instagram text
	check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$');
