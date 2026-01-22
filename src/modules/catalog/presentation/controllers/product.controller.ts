import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser, UserRole } from '@common/types';
import { formatTimeRange, getDateLabel } from '@common/utils/date.util';
import { CreateProductDto, ProductResponseDto } from '../../application/dto';
import {
  CreateProductUseCase,
  GetProductByIdUseCase,
  GetSellerProductsUseCase,
  DeactivateProductUseCase,
} from '../../application/use-cases';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
  ) {}

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ product: ProductResponseDto }> {
    const product = await this.getProductByIdUseCase.execute(id);

    return {
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        originalPrice: product.originalPrice,
        discountedPrice: product.discountedPrice,
        discountPercent: product.discountPercent,
        quantity: product.quantity,
        quantityAvailable: product.quantityAvailable,
        pickupWindow: {
          start: product.pickupWindowStart,
          end: product.pickupWindowEnd,
          label: formatTimeRange(product.pickupWindowStart, product.pickupWindowEnd),
          dateLabel: getDateLabel(product.pickupWindowStart),
        },
        status: product.status,
        images: product.images?.map((img) => ({
          url: img.url,
          thumbnailUrl: img.thumbnailUrl,
          position: img.position,
        })) || [],
        store: {
          id: product.store.id,
          name: product.store.name,
          rating: Number(product.store.rating),
          imageUrl: product.store.imageUrl,
          location: {
            address: product.store.address,
            lat: Number(product.store.lat),
            lng: Number(product.store.lng),
          },
        },
        category: {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        },
        createdAt: product.createdAt,
      },
    };
  }
}

@ApiTags('Seller')
@Controller('seller/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
@ApiBearerAuth('JWT-auth')
export class SellerProductController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getSellerProductsUseCase: GetSellerProductsUseCase,
    private readonly deactivateProductUseCase: DeactivateProductUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product listing' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ) {
    const product = await this.createProductUseCase.execute(user.id, dto);
    return {
      product: {
        id: product.id,
        name: product.name,
        status: product.status,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get seller active products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  async getSellerProducts(@CurrentUser() user: AuthenticatedUser) {
    const products = await this.getSellerProductsUseCase.execute(user.id);
    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.images?.[0]?.url || null,
        price: p.discountedPrice,
        quantity: p.quantity,
        quantityAvailable: p.quantityAvailable,
        status: p.status,
        pickupWindow: {
          label: formatTimeRange(p.pickupWindowStart, p.pickupWindowEnd),
        },
      })),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a product' })
  @ApiResponse({ status: 200, description: 'Product deactivated' })
  async deactivateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const product = await this.deactivateProductUseCase.execute(user.id, id);
    return {
      product: {
        id: product.id,
        status: product.status,
      },
    };
  }
}
