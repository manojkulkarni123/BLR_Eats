-- Recommendations can be up to 280 characters (about 50 words).
alter table public.spots drop constraint spots_recommendation_check;
alter table public.spots add constraint spots_recommendation_check
	check (char_length(recommendation) <= 280);
