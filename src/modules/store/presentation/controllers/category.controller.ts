import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { CategoryResponseDto } from '../../application/dto';
import { GetCategoriesUseCase } from '../../application/use-cases';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly getCategoriesUseCase: GetCategoriesUseCase) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all product categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories(): Promise<{ categories: CategoryResponseDto[] }> {
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
