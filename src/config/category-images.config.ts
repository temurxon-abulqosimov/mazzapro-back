export const CATEGORY_IMAGES: Record<string, string[]> = {
    // Fast Food (Burger, KFC, Fries)
    'fast-food': [
        'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80', // Burger
        'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80', // Fried Chicken
        'https://images.unsplash.com/photo-1573080496987-a226719b999c?auto=format&fit=crop&w=800&q=80', // Fries
    ],

    // Bakery & Bread
    'bakery': [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', // Bread assortment
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80', // Croissants
    ],

    // Desserts (Cakes, Sweets)
    'desserts': [
        'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80', // Cake
        'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80', // Donuts
    ],

    // Traditional Meals (Palov, Local Cuisine)
    'traditional': [
        'https://images.unsplash.com/photo-1622325375487-70dd90e1f35f?auto=format&fit=crop&w=800&q=80', // Plov-like rice dish
        'https://images.unsplash.com/photo-1529193591184-b1d580690dd0?auto=format&fit=crop&w=800&q=80', // Kebab/Shashlik
    ],

    // Salads & Healthy
    'salad': [
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', // Mixed Salad
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', // Green Salad
    ],

    // Default fallback
    'default': [
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', // General Food
    ]
};

export const DEFAULT_CATEGORY_IMAGES = CATEGORY_IMAGES['default'];

export const getImagesForCategory = (slug: string): string[] => {
    return CATEGORY_IMAGES[slug] || DEFAULT_CATEGORY_IMAGES;
};
