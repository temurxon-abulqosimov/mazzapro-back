import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCategoryIcons1770489085165 implements MigrationInterface {
  name = 'UpdateCategoryIcons1770489085165';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update or insert categories with proper icon URLs
    const categories = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Bakery',
        slug: 'bakery',
        icon: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        displayOrder: 1,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Desserts',
        slug: 'desserts',
        icon: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
        displayOrder: 2,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Fast Food',
        slug: 'fast-food',
        icon: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80',
        displayOrder: 3,
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Traditional',
        slug: 'traditional',
        icon: 'https://images.unsplash.com/photo-1622325375487-70dd90e1f35f?auto=format&fit=crop&w=800&q=80',
        displayOrder: 4,
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Salads & Healthy',
        slug: 'salad',
        icon: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
        displayOrder: 5,
      },
    ];

    for (const cat of categories) {
      await queryRunner.query(
        `
        INSERT INTO categories (id, name, slug, icon, display_order, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          icon = EXCLUDED.icon,
          display_order = EXCLUDED.display_order
      `,
        [cat.id, cat.name, cat.slug, cat.icon, cat.displayOrder],
      );
    }

    // Also update by slug for any categories that were created with different IDs
    for (const cat of categories) {
      await queryRunner.query(
        `
        UPDATE categories
        SET icon = $1, name = $2
        WHERE slug = $3
      `,
        [cat.icon, cat.name, cat.slug],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert icons to empty (or original values if known)
    await queryRunner.query(`
      UPDATE categories SET icon = NULL
      WHERE slug IN ('bakery', 'desserts', 'fast-food', 'traditional', 'salad')
    `);
  }
}
