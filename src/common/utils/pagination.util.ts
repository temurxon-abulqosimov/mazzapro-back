import { CursorPayload, PaginatedResult } from '@common/types';

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded) as CursorPayload;
  } catch {
    return null;
  }
}

export function createPaginatedResult<T extends { id: string }>(
  items: T[],
  limit: number,
  getLastValue?: (item: T) => string | number,
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  let cursor: string | null = null;
  if (hasMore && resultItems.length > 0) {
    const lastItem = resultItems[resultItems.length - 1];
    cursor = encodeCursor({
      lastId: lastItem.id,
      lastValue: getLastValue ? getLastValue(lastItem) : undefined,
    });
  }

  return {
    items: resultItems,
    cursor,
    hasMore,
  };
}
