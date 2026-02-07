// Explicit migration imports for TypeORM DataSource
// This avoids glob pattern resolution issues in production
export { InitialSchema1737590400000 } from './migrations/1737590400000-InitialSchema';
export { AlignProductSchema1737600000000 } from './migrations/1737600000000-AlignProductSchema';
export { UpdateMarketsSchema1738242000000 } from './migrations/1738242000000-UpdateMarketsSchema';
export { AddDisplayOrderToCategories1738245000000 } from './migrations/1738245000000-AddDisplayOrderToCategories';
export { UpdateSellersTable1738246000000 } from './migrations/1738246000000-UpdateSellersTable';
export { AddLocationFieldsToSellers1738247000000 } from './migrations/1738247000000-AddLocationFieldsToSellers';
export { AddCreatedAtToCategories1738248000000 } from './migrations/1738248000000-AddCreatedAtToCategories';
export { AddIsOpenToStores1738728000000 } from './migrations/1738728000000-AddIsOpenToStores';
export { AddProductSupportToFavorites1738830000000 } from './migrations/1738830000000-AddProductSupportToFavorites';
export { FixFavoritesConstraints1738930000000 } from './migrations/1738930000000-FixFavoritesConstraints';
export { AddFollowsAndNotificationPreferences1770289085165 } from './migrations/1770289085165-AddFollowsAndNotificationPreferences';
export { AddGoogleAuthFields1770389085165 } from './migrations/1770389085165-AddGoogleAuthFields';
