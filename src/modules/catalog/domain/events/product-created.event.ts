export class ProductCreatedEvent {
    constructor(
        public readonly productId: string,
        public readonly storeId: string,
        public readonly storeName: string,
        public readonly productName: string,
        public readonly originalPrice: number,
        public readonly discountedPrice: number,
        public readonly imageUrl: string | null,
    ) { }
}
