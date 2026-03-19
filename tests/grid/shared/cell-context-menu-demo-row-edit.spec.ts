import { test, expect } from '~/fixtures.ts';

test.describe('Cell Context Menu Demo Row Editing', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/grid-lite/demo/cell-context-menu');

        await page.waitForFunction(() => {
            return document.querySelectorAll(
                'tbody.hcg-tbody-scrollable tr'
            ).length > 0;
        });
    });

    test('Add row below inserts a new row via submenu action', async (
        { page }
    ) => {
        const rows = page.locator('tbody.hcg-tbody-scrollable tr');
        const beforeCount = await rows.count();

        const targetCell = page.locator(
            'tbody.hcg-tbody-scrollable tr[data-row-index="1"] ' +
            'td[data-column-id="product"]'
        );

        await targetCell.click({ button: 'right' });
        await page.locator('.hcg-menu-item', { hasText: 'Edit' }).click();
        await page.locator('.hcg-menu-item', { hasText: 'Rows' }).click();
        // Direct activation keeps this demo regression test deterministic
        // in headless browsers while still validating button wiring.
        await page.locator('.hcg-menu-item', {
            hasText: 'Add row below'
        }).evaluate((button) => {
            (button as HTMLButtonElement).click();
        });

        await expect(rows).toHaveCount(beforeCount + 1);
        await expect(
            page.locator(
                'tbody.hcg-tbody-scrollable tr[data-row-index="2"] ' +
                'td[data-column-id="product"]'
            )
        ).toHaveText('New item');
    });

    test('Add row above inserts a new row via submenu action', async (
        { page }
    ) => {
        const rows = page.locator('tbody.hcg-tbody-scrollable tr');
        const beforeCount = await rows.count();

        const targetCell = page.locator(
            'tbody.hcg-tbody-scrollable tr[data-row-index="2"] ' +
            'td[data-column-id="product"]'
        );

        await targetCell.click({ button: 'right' });
        await page.locator('.hcg-menu-item', { hasText: 'Edit' }).click();
        await page.locator('.hcg-menu-item', { hasText: 'Rows' }).click();
        // Direct activation keeps this demo regression test deterministic
        // in headless browsers while still validating button wiring.
        await page.locator('.hcg-menu-item', {
            hasText: 'Add row above'
        }).evaluate((button) => {
            (button as HTMLButtonElement).click();
        });

        await expect(rows).toHaveCount(beforeCount + 1);
        await expect(
            page.locator(
                'tbody.hcg-tbody-scrollable tr[data-row-index="2"] ' +
                'td[data-column-id="product"]'
            )
        ).toHaveText('New item');
    });

    test('Pinning submenu is active in the demo and pins the clicked row', async ({
        page
    }) => {
        const targetCell = page.locator(
            'tbody.hcg-tbody-scrollable tr[data-row-index="1"] ' +
            'td[data-column-id="product"]'
        );

        await targetCell.click({ button: 'right' });
        await page.locator('.hcg-menu-item', { hasText: 'Pinning' }).click();

        const pinTopButton = page.locator('.hcg-menu-item', {
            hasText: 'Pin row to top'
        }).last();
        await expect(pinTopButton).not.toHaveAttribute('disabled', '');
        await pinTopButton.click();

        await expect(
            page.locator(
                'tbody.hcg-tbody-pinned-top td[data-column-id="product"]'
            )
        ).toContainText('Pears');
    });

    test('Demo stays within viewport after narrow resize', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(100);

        const layout = await page.evaluate(() => ({
            innerWidth: window.innerWidth,
            bodyScrollWidth: document.body.scrollWidth,
            demoScrollWidth:
                document.querySelector('.demo')?.scrollWidth || 0,
            eventLogScrollWidth:
                document.querySelector('.event-log')?.scrollWidth || 0
        }));

        expect(layout.bodyScrollWidth).toBeLessThanOrEqual(
            layout.innerWidth + 1
        );
        expect(layout.demoScrollWidth).toBeLessThanOrEqual(
            layout.innerWidth + 1
        );
        expect(layout.eventLogScrollWidth).toBeLessThanOrEqual(
            layout.innerWidth + 1
        );
    });
});
