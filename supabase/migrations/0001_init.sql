-- blr_eats v1 schema. Every map is public to read; only its owner can write.

create extension if not exists citext with schema extensions;

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	handle extensions.citext not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
	display_name text not null check (char_length(display_name) between 1 and 40),
	avatar_path text,
	bio text check (char_length(bio) <= 120),
	theme text not null default 'namma-pop',
	created_at timestamptz not null default now()
);

create table public.custom_categories (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references public.profiles (id) on delete cascade,
	name text not null check (char_length(name) between 1 and 30),
	slug text not null,
	emoji text not null default '📍',
	created_at timestamptz not null default now(),
	unique (owner_id, slug)
);
create unique index custom_categories_owner_name on public.custom_categories (owner_id, lower(name));

create table public.spots (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references public.profiles (id) on delete cascade,
	name text not null check (char_length(name) between 1 and 80),
	slug text not null,
	lat double precision not null check (lat between 12.6 and 13.4),
	lng double precision not null check (lng between 77.2 and 78.0),
	area text not null default '',
	area_slug text not null default '',
	category text check (
		category in (
			'south-indian', 'biryani', 'north-indian', 'chinese', 'asian', 'burgers',
			'pizza', 'italian', 'street-food', 'cafes', 'desserts', 'bars'
		)
	),
	custom_category_id uuid references public.custom_categories (id) on delete set null,
	recommendation text check (char_length(recommendation) <= 200),
	reel_url text check (reel_url is null or reel_url ~ '^https://(www\.)?instagram\.com/'),
	osm_id text,
	created_at timestamptz not null default now(),
	unique (owner_id, slug)
);
create index spots_owner on public.spots (owner_id, created_at);

create table public.spot_photos (
	id uuid primary key default gen_random_uuid(),
	spot_id uuid not null references public.spots (id) on delete cascade,
	owner_id uuid not null references public.profiles (id) on delete cascade,
	path text not null,
	thumb_path text not null,
	width int not null,
	height int not null,
	position int not null default 0,
	created_at timestamptz not null default now()
);
create index spot_photos_spot on public.spot_photos (spot_id, position);
create index spot_photos_owner on public.spot_photos (owner_id);
create index spots_custom_category on public.spots (custom_category_id);

-- Row level security: public read, owner write.
alter table public.profiles enable row level security;
alter table public.custom_categories enable row level security;
alter table public.spots enable row level security;
alter table public.spot_photos enable row level security;

create policy "public read" on public.profiles for select using (true);
create policy "owner insert" on public.profiles for insert with check ((select auth.uid()) = id);
create policy "owner update" on public.profiles for update using ((select auth.uid()) = id);

create policy "public read" on public.custom_categories for select using (true);
create policy "owner write" on public.custom_categories for all
	using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "public read" on public.spots for select using (true);
create policy "owner write" on public.spots for all
	using ((select auth.uid()) = owner_id)
	with check (
		(select auth.uid()) = owner_id
		-- A custom category must be the owner's own.
		and (
			custom_category_id is null
			or exists (
				select 1 from public.custom_categories c
				where c.id = custom_category_id and c.owner_id = (select auth.uid())
			)
		)
	);

create policy "public read" on public.spot_photos for select using (true);
create policy "owner write" on public.spot_photos for all
	using ((select auth.uid()) = owner_id)
	with check (
		(select auth.uid()) = owner_id
		-- Photos can only be attached to the owner's own spots.
		and exists (
			select 1 from public.spots s where s.id = spot_id and s.owner_id = (select auth.uid())
		)
	);

-- Photos: public bucket, owners write only inside their own folder (<uid>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 3145728, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "owner upload" on storage.objects for insert to authenticated
	with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owner delete" on storage.objects for delete to authenticated
	using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Supabase's own helper; it runs from an event trigger and shouldn't be callable over the API.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
