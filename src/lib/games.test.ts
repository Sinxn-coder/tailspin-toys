import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getAllPublisherIds,
    getPublisherById,
    getGamesByPublisher,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One', description: 'pub' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('returns all publisher ids ordered by name', async () => {
        await db.insert(publishers).values([
            { name: 'Zebra Games', description: 'First publisher' },
            { name: 'Apple Studios', description: 'Second publisher' },
            { name: 'Middle Press', description: 'Third publisher' },
        ]);
        const ids = await getAllPublisherIds(db);
        expect(ids.length).toBe(3);
        // Verify ordering by fetching publishers
        const publisherList = await Promise.all(ids.map((id) => getPublisherById(db, id)));
        expect(publisherList.map((p) => p?.name)).toEqual([
            'Apple Studios',
            'Middle Press',
            'Zebra Games',
        ]);
    });

    it('fetches a single publisher by id', async () => {
        await seedGames(db, 1);
        const ids = await getAllPublisherIds(db);
        const publisher = await getPublisherById(db, ids[0]);
        expect(publisher?.name).toBe('Pub One');
        expect(publisher?.description).toBe('pub');
    });

    it('returns null for a non-existent publisher', async () => {
        await seedGames(db, 1);
        expect(await getPublisherById(db, 99999)).toBeNull();
    });

    it('returns all games for a publisher ordered by title', async () => {
        await seedGames(db, 5);
        const [publisher] = await db.insert(publishers).values({ name: 'Pub Two', description: 'pub2' }).returning({ id: publishers.id });
        const [category] = await db.select().from(categories).limit(1);
        // Insert games for the second publisher in reverse order
        for (let i = 3; i >= 1; i--) {
            await db.insert(games).values({
                title: `Pub Two Game ${i}`,
                description: `Description ${i}`,
                starRating: 3.5,
                categoryId: category.id,
                publisherId: publisher.id,
            });
        }
        const publisherGames = await getGamesByPublisher(db, publisher.id);
        expect(publisherGames.length).toBe(3);
        expect(publisherGames.map((g) => g.title)).toEqual([
            'Pub Two Game 1',
            'Pub Two Game 2',
            'Pub Two Game 3',
        ]);
        expect(publisherGames[0].publisher?.id).toBe(publisher.id);
        expect(publisherGames[0].publisher?.name).toBe('Pub Two');
    });

    it('returns empty array for publisher with no games', async () => {
        const [publisher] = await db.insert(publishers).values({ name: 'Empty Publisher' }).returning({ id: publishers.id });
        const publisherGames = await getGamesByPublisher(db, publisher.id);
        expect(publisherGames).toEqual([]);
    });
});
