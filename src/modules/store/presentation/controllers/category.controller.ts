import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CategoryResponseDto } from '../../application/dto';
import { GetCategoriesUseCase } from '../../application/use-cases';
import { CATEGORY_IMAGES } from '@config/category-images.config';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly getCategoriesUseCase: GetCategoriesUseCase) { }

  @Get('images')
  @Public()
  @ApiOperation({ summary: 'Get default images for categories' })
  @ApiResponse({ status: 200, description: 'Map of category slugs to image URLs' })
  getCategoryImages() {
    return CATEGORY_IMAGES;
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all product categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories() {
    const categories = await this.getCategoriesUseCase.execute();
    return {
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
      })),
    };
  }
}
