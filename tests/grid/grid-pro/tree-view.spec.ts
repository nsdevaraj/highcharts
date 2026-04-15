import type { Page } from '@playwright/test';

import { test, expect } from '~/fixtures.ts';

async function loadGridPro(page: Page): Promise<void> {
    await page.setContent(`
        <!DOCTYPE html>
        <html>
            <head>
                <script src="https://code.highcharts.com/grid/grid-pro.js"></script>
                <link rel="stylesheet" href="https://code.highcharts.com/grid/grid-pro.css">
            </head>
            <body>
                <div id="container"></div>
            </body>
        </html>
    `, { waitUntil: 'networkidle' });
}

async function getVisibleRowIds(page: Page): Promise<Array<string | null>> {
    return page.locator('tbody .hcg-row').evaluateAll((rows): Array<string | null> =>
        rows.map((row): string | null => row.getAttribute('data-row-id'))
    );
}

test.describe('Grid Pro - tree view', () => {
    test('projects parentId rows and toggles nested children', async ({ page }) => {
        await loadGridPro(page);

        await page.evaluate(async (): Promise<void> => {
            (window as any).grid = await (window as any).Grid.grid('container', {
                data: {
                    columns: {
                        id: [1, 2, 3, 4],
                        parentId: [null, 1, 1, 2],
                        name: ['Root', 'Sales', 'Marketing', 'EMEA']
                    },
                    idColumn: 'id',
                    treeView: {
                        treeColumn: 'name'
                    }
                },
                rendering: {
                    rows: {
                        virtualization: false
                    }
                }
            }, true);
        });

        await expect(page.locator('tbody .hcg-row')).toHaveCount(1);
        expect(await getVisibleRowIds(page)).toStrictEqual(['1']);

        await page.locator('[data-hcg-tree-toggle]').first().click();
        await expect(page.locator('tbody .hcg-row')).toHaveCount(3);
        expect(await getVisibleRowIds(page)).toStrictEqual(['1', '2', '3']);

        await page.locator('[data-hcg-tree-toggle]').nth(1).click();
        await expect(page.locator('tbody .hcg-row')).toHaveCount(4);
        expect(await getVisibleRowIds(page)).toStrictEqual([
            '1',
            '2',
            '4',
            '3'
        ]);
    });

    test('keeps generated path parents addressable after pagination', async ({ page }) => {
        await loadGridPro(page);

        await page.evaluate(async (): Promise<void> => {
            (window as any).grid = await (window as any).Grid.grid('container', {
                data: {
                    columns: {
                        id: [1, 2],
                        path: ['A/a', 'B/b'],
                        name: ['a', 'b']
                    },
                    idColumn: 'id',
                    treeView: {
                        input: {
                            type: 'path'
                        },
                        treeColumn: 'name',
                        initiallyExpanded: true
                    }
                },
                pagination: {
                    enabled: true,
                    pageSize: 2
                },
                rendering: {
                    rows: {
                        virtualization: false
                    }
                }
            }, true);

            await (window as any).grid.pagination.goToPage(2);
        });

        await expect(page.locator('tbody .hcg-row')).toHaveCount(2);
        expect(await getVisibleRowIds(page)).toStrictEqual([
            '__hcg_tree_path__:B',
            '2'
        ]);

        await page.locator('[data-hcg-tree-toggle]').first().click();

        await expect(page.locator('tbody .hcg-row')).toHaveCount(1);
        expect(await getVisibleRowIds(page)).toStrictEqual([
            '__hcg_tree_path__:B'
        ]);
        await expect(page.locator('[data-hcg-tree-toggle]'))
            .toHaveAttribute('aria-expanded', 'false');
    });
});
