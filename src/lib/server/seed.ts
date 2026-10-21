import type { CategoryKey } from '#lib/categories.ts';
import { slugify } from '#lib/slug.ts';
import type { FoodMap, Spot } from '#lib/types.ts';

// Demo map used until Supabase is connected (M2). Coordinates are approximate.

type SeedSpot = {
	name: string;
	area: string;
	address?: string;
	lat: number;
	lng: number;
	category: CategoryKey | null;
	customCategoryId?: string;
	recommendation: string | null;
};

const seedSpots: SeedSpot[] = [
	{
		name: 'CTR',
		area: 'Malleswaram',
		address: '7th Cross Rd',
		lat: 12.9984,
		lng: 77.5697,
		category: 'south-indian',
		recommendation: 'Benne masala dosa. Go before 9 to beat the queue.'
	},
	{
		name: 'Vidyarthi Bhavan',
		area: 'Basavanagudi',
		address: '32, Gandhi Bazaar Main Rd',
		lat: 12.9452,
		lng: 77.5712,
		category: 'south-indian',
		recommendation: 'Crispy masala dosa. Sharing a table is part of the fun.'
	},
	{
		name: 'MTR',
		area: 'Lalbagh Road',
		address: '14, Lalbagh Rd',
		lat: 12.9551,
		lng: 77.5856,
		category: 'south-indian',
		recommendation: 'Rava idli where it was invented. Finish with filter coffee.'
	},
	{
		name: "Brahmin's Coffee Bar",
		area: 'Basavanagudi',
		lat: 12.9536,
		lng: 77.5682,
		category: 'cafes',
		recommendation: 'Idli vada and coffee, standing. Five minutes of heaven.'
	},
	{
		name: 'Meghana Foods',
		area: 'Koramangala',
		address: '124, 1st A Cross Rd',
		lat: 12.9343,
		lng: 77.6191,
		category: 'biryani',
		recommendation: 'Boneless chicken biryani. One plate feeds two.'
	},
	{
		name: 'Truffles',
		area: 'Koramangala',
		address: '28, 4th B Cross Rd',
		lat: 12.9332,
		lng: 77.6146,
		category: 'burgers',
		recommendation: 'The classic cheeseburger with a cold coffee.'
	},
	{
		name: 'Toit',
		area: 'Indiranagar',
		address: '298, 100 Feet Rd',
		lat: 12.9792,
		lng: 77.6408,
		category: 'bars',
		recommendation: 'House-brewed wheat beer. Go early on weekends.'
	},
	{
		name: 'Corner House',
		area: 'Residency Road',
		address: '45/3, Residency Rd',
		lat: 12.9667,
		lng: 77.604,
		category: 'desserts',
		recommendation: 'Death by Chocolate. Non-negotiable.'
	},
	{
		name: 'VV Puram Food Street',
		area: 'Basavanagudi',
		lat: 12.9497,
		lng: 77.5737,
		category: 'street-food',
		recommendation: null
	},
	{
		name: "Koshy's",
		area: 'St Marks Road',
		lat: 12.9737,
		lng: 77.6004,
		category: 'cafes',
		recommendation: 'Old Bangalore breakfast. Appam and stew.'
	},
	{
		name: 'Shivaji Military Hotel',
		area: 'Jayanagar',
		address: '718, 45th Cross Rd',
		lat: 12.9271,
		lng: 77.5838,
		category: null,
		customCategoryId: 'military',
		recommendation: 'Donne biryani for an early lunch. It sells out.'
	}
];

function toSpot(s: SeedSpot, i: number): Spot {
	return {
		id: `seed-${i}`,
		slug: slugify(`${s.name} ${s.area}`),
		name: s.name,
		lat: s.lat,
		lng: s.lng,
		area: s.area,
		areaSlug: slugify(s.area),
		address: s.address ?? '',
		category: s.category,
		customCategoryId: s.customCategoryId ?? null,
		recommendation: s.recommendation,
		reelUrl: null,
		photos: []
	};
}

export const seedMaps: Record<string, FoodMap> = {
	demo: {
		profile: {
			id: 'demo',
			handle: 'demo',
			displayName: 'Demo',
			avatarUrl: null,
			avatarPath: null,
			bio: 'Dosa first, questions later.',
			instagram: null,
			theme: 'bengaluru-poster'
		},
		spots: seedSpots.map(toSpot),
		lists: [],
		customCategories: [
			{ id: 'military', name: 'Military hotels', slug: 'military-hotels', emoji: '🍖' }
		]
	}
};
