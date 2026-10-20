import type { FoodMap } from '#lib/types.ts';
import { seedMaps } from './seed.ts';

// The one place that loads a map. M2 swaps the seed lookup for Supabase.
export async function getMap(handle: string): Promise<FoodMap | null> {
	return seedMaps[handle.toLowerCase()] ?? null;
}
