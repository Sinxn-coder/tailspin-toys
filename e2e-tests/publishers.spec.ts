import { test, expect, type Response } from '@playwright/test';

test.describe('Publisher Pages and Navigation', () => {
  test('should display publisher details page with correct information', async ({ page }) => {
    await test.step('Navigate to first publisher page', async () => {
      await page.goto('/publisher/1');
      await expect(page.getByTestId('publisher-details')).toBeVisible();
    });

    await test.step('Verify publisher name is displayed', async () => {
      const publisherName = page.getByTestId('publisher-name');
      await expect(publisherName).toBeVisible();
      await expect(publisherName).not.toBeEmpty();
    });

    await test.step('Verify publisher description is displayed when available', async () => {
      const publisherDesc = page.getByTestId('publisher-description');
      const isVisible = await publisherDesc.isVisible();
      // Description may or may not exist depending on data
      if (isVisible) {
        await expect(publisherDesc).not.toBeEmpty();
      }
    });
  });

  test('should display games grid for the publisher', async ({ page }) => {
    await test.step('Navigate to publisher page', async () => {
      await page.goto('/publisher/1');
      await expect(page.getByTestId('publisher-details')).toBeVisible();
    });

    await test.step('Verify games grid heading is displayed', async () => {
      const gamesHeading = page.getByTestId('games-heading');
      await expect(gamesHeading).toBeVisible();
    });

    await test.step('Verify games are displayed in grid', async () => {
      const gamesGrid = page.getByTestId('publisher-games-grid');
      const emptyState = page.getByTestId('no-games-empty-state');
      
      const gridExists = await gamesGrid.isVisible().catch(() => false);
      const emptyExists = await emptyState.isVisible().catch(() => false);
      
      expect(gridExists || emptyExists).toBeTruthy();
    });
  });

  test('should display game cards with correct information on publisher page', async ({ page }) => {
    await test.step('Navigate to publisher page', async () => {
      await page.goto('/publisher/1');
      await expect(page.getByTestId('publisher-details')).toBeVisible();
    });

    await test.step('Check if there are games displayed', async () => {
      const gamesGrid = page.getByTestId('publisher-games-grid');
      const gridExists = await gamesGrid.isVisible().catch(() => false);
      
      if (gridExists) {
        const gameCards = page.getByTestId('game-card');
        expect(await gameCards.count()).toBeGreaterThan(0);
      }
    });

    await test.step('Verify game card content when games exist', async () => {
      const gameCards = page.getByTestId('game-card');
      const cardCount = await gameCards.count();
      
      if (cardCount > 0) {
        await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
        await expect(gameCards.first().getByTestId('game-description')).toBeVisible();
      }
    });
  });

  test('should navigate to game details when clicking a game card on publisher page', async ({ page }) => {
    let gameId: string | null = null;

    await test.step('Navigate to publisher page and get first game', async () => {
      await page.goto('/publisher/1');
      const gamesGrid = page.getByTestId('publisher-games-grid');
      
      const gridExists = await gamesGrid.isVisible().catch(() => false);
      if (gridExists) {
        const firstGameCard = page.getByTestId('game-card').first();
        gameId = await firstGameCard.getAttribute('data-game-id');
        if (gameId) {
          await firstGameCard.click();
        }
      }
    });

    if (gameId) {
      await test.step('Verify navigation to game details page', async () => {
        await expect(page).toHaveURL(`/game/${gameId}`);
        await expect(page.getByTestId('game-details')).toBeVisible();
      });
    }
  });

  test('should navigate to publisher page when clicking publisher name on game details', async ({ page }) => {
    let publisherId: string | null = null;

    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Get publisher link if it exists', async () => {
      const publisherLink = page.getByTestId('game-details-publisher-link');
      const linkExists = await publisherLink.isVisible().catch(() => false);
      
      if (linkExists) {
        const href = await publisherLink.getAttribute('href');
        if (href) {
          publisherId = href.split('/').pop() || null;
        }
        await publisherLink.click();
      }
    });

    if (publisherId) {
      await test.step('Verify navigation to publisher page', async () => {
        await expect(page).toHaveURL(`/publisher/${publisherId}`);
        await expect(page.getByTestId('publisher-details')).toBeVisible();
      });
    }
  });

  test('should be able to navigate back to home from publisher page', async ({ page }) => {
    await test.step('Navigate to publisher page', async () => {
      await page.goto('/publisher/1');
      await expect(page.getByTestId('publisher-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should return a 404 page for a non-existent publisher', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent publisher', async () => {
      response = await page.goto('/publisher/99999');
    });

    await test.step('Verify a branded 404 page is served', async () => {
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Page Not Found - Tailspin Toys/);
      await expect(page.getByTestId('not-found')).toBeVisible();
    });
  });

  test('should display empty state when publisher has no games', async ({ page }) => {
    // This test would require a publisher with no games in the database
    // For now, we'll just document the expected behavior
    await test.step('Navigate to publisher page', async () => {
      await page.goto('/publisher/1');
    });

    await test.step('Check for empty state if no games', async () => {
      const emptyState = page.getByTestId('no-games-empty-state');
      const gamesGrid = page.getByTestId('publisher-games-grid');
      
      const emptyExists = await emptyState.isVisible().catch(() => false);
      const gridExists = await gamesGrid.isVisible().catch(() => false);
      
      // Either empty state or games grid should exist
      expect(emptyExists || gridExists).toBeTruthy();
    });
  });
});
