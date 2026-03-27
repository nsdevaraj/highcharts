import { test, expect } from '~/fixtures.ts';

test.describe('Pagination', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto('/grid-lite/e2e/pagination', { waitUntil: 'networkidle' });
        // Wait for pagination to be rendered
        await expect(page.locator('.hcg-pagination')).toBeVisible();
    });

    test('Render pagination container', async ({ page }) => {

        // Check page info is displayed with correct initial page size
        const pageInfo = page.locator('.hcg-pagination-info');
        await expect(pageInfo).toBeVisible();
        await expect(pageInfo).toContainText('Showing 1');

        // Check controls buttons exist
        await expect(page.locator('.hcg-pagination-controls')).toBeVisible();

        // Check first/last buttons
        const buttons = page.locator('.hcg-button');
        const buttonCount = await buttons.count();
        expect(buttonCount).toBeGreaterThanOrEqual(4);

        // Check page size selector with correct initial value
        await expect(page.locator('.hcg-pagination-page-size select.hcg-input')).toBeVisible();

        // Check page number buttons
        const navButtons = page.locator('.hcg-pagination-pages .hcg-button');
        const navButtonCount = await navButtons.count();
        expect(navButtonCount).toBeGreaterThanOrEqual(1);
        await expect(page.locator('.hcg-button-selected')).toContainText('1');

        // Check initial data rows
        await expect(page.locator('table tbody tr')).toHaveCount(22);
    });

    test('Next/previous button', async ({ page }) => {

        // Click next page button
        await page.locator('.hcg-button[title="Next page"]').click();

        // Check page info updates
        await expect(page.locator('.hcg-pagination-info')).toContainText('Showing 23');

        // Check active page button updates
        await expect(page.locator('.hcg-button-selected')).toContainText('2');

        // Check data rows update
        await expect(page.locator('table tbody tr')).toHaveCount(22);

        // Click previous button
        await page.locator('.hcg-button[title="Previous page"]').click();

        // Check we're back on page 1
        await expect(page.locator('.hcg-pagination-info')).toContainText('Showing 1');
        await expect(page.locator('.hcg-button-selected')).toContainText('1');
    });

    test('First/last button', async ({ page }) => {

        // Click last button to go to last page
        await page.locator('.hcg-button[title="Last page"]').click();

        // Check we're on the last page
        await expect(page.locator('.hcg-pagination-info')).toContainText('Showing 243 - 254 of 254');

        // Check button states - last button should be disabled
        await expect(page.locator('.hcg-button[title="Last page"]')).toBeDisabled();
        await expect(page.locator('.hcg-button[title="Next page"]')).toBeDisabled();
        await expect(page.locator('.hcg-button[title="First page"]')).toBeEnabled();
        await expect(page.locator('.hcg-button[title="Previous page"]')).toBeEnabled();

        // Click first button to go back to first page
        await page.locator('.hcg-button[title="First page"]').click();
        await expect(page.locator('.hcg-button[title="Last page"]')).toBeEnabled();
        await expect(page.locator('.hcg-button[title="Next page"]')).toBeEnabled();

        // Check we're back on first page
        await expect(page.locator('.hcg-pagination-info')).toContainText('Showing 1 - 22 of 254');
    });

    test('Direct page number', async ({ page }) => {

        // Click on page number
        await page.locator('.hcg-pagination-pages .hcg-button').filter({ hasText: '3' }).click();

        // Check we're on page
        await expect(page.locator('.hcg-pagination-info')).toContainText('Showing 45 - 66 of 254');
    });

    test('Update pagination', async ({ page }) => {

        // Disable pagination
        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    enabled: false
                }
            });
        });

        await expect(page.locator('.hcg-pagination')).toBeHidden();

        // Enable pagination
        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    enabled: true
                }
            });
        });

        await expect(page.locator('.hcg-pagination')).toBeVisible();
        await expect(page.locator('table tbody tr')).toHaveCount(22);
    });

    test('Page size', async ({ page }) => {

        // Change page size to 20
        await page.locator('.hcg-pagination-page-size select.hcg-input').first().selectOption('20');

        // Check page info updates
        await expect(page.locator('.hcg-pagination-info')).toContainText('Showing 1 - 20');

        // Check data rows update
        await expect(page.locator('table tbody tr')).toHaveCount(20);
    });

    test('Sorted pagination', async ({ page }) => {
        await page.goto('/grid-lite/e2e/pagination', { waitUntil: 'networkidle' });

        // Wait for Grid to be initialized (with timeout)
        await page.waitForFunction(() => {
            return typeof (window as any).Grid !== 'undefined' &&
                (window as any).Grid.grids &&
                (window as any).Grid.grids.length > 0;
        }, { timeout: 5000 });

        // Set page size to 5
        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    pageSize: 5
                }
            });
        });

        // Click on the name column header to sort
        await page.locator('table th[data-column-id="Name"]').first().click();

        // First row does not contain Michael
        await expect(page.locator('table tbody tr').first()).not.toContainText('Michael');
    });

    test('Lang support', async ({ page }) => {
        await page.goto('/grid-lite/e2e/pagination', { waitUntil: 'networkidle' });

        // Wait for Grid to be initialized (with timeout)
        await page.waitForFunction(() => {
            return typeof (window as any).Grid !== 'undefined' &&
                (window as any).Grid.grids &&
                (window as any).Grid.grids.length > 0;
        }, { timeout: 5000 });

        // Update lang options
        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                lang: {
                    pagination: {
                        pageInfo: 'Total pages {total}',
                        pageSizeLabel: 'Items per page',
                    }
                }
            });
        });

        await expect(page.locator('.hcg-pagination-info').first()).toContainText('Total pages');
        await expect(page.locator('.hcg-pagination-page-size').first()).toContainText('Items per page');
    });

    test('Position parameter - custom container', async ({ page }) => {

        // Test custom container position
        await page.evaluate(async () => {
            await (window as any).Grid.grids[0].update({
                pagination: {
                    enabled: true,
                    position: '#test-custom-container'
                }
            });
        });

        // Wait for custom container to be visible
        await expect(page.locator('#test-custom-container')).toBeVisible();

        // Check that custom container exists and contains pagination
        await expect(page.locator('#test-custom-container')).toBeVisible();
        await expect(page.locator('#test-custom-container .hcg-pagination-controls')).toBeVisible();
        await expect(page.locator('#test-custom-container .hcg-pagination-info')).toBeVisible();
        const navButtons = page.locator('#test-custom-container .hcg-pagination-pages .hcg-button');
        const buttonCount = await navButtons.count();
        expect(buttonCount).toBeGreaterThan(0);
    });

    test('Position parameter - top/bottom/footer', async ({ page }) => {
        await page.goto('/grid-lite/e2e/pagination', { waitUntil: 'networkidle' });

        // Wait for Grid to be initialized (with timeout)
        await page.waitForFunction(() => {
            return typeof (window as any).Grid !== 'undefined' &&
                (window as any).Grid.grids &&
                (window as any).Grid.grids.length > 0;
        }, { timeout: 5000 });

        // Test top position
        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    enabled: true,
                    position: 'top'
                }
            });
        });

        await expect(page.locator('.hcg-pagination')).toBeVisible();

        // Verify the DOM order: pagination should be before table
        const container = page.locator('.hcg-container');
        const paginationIndex = await container.locator('.hcg-pagination').evaluate((el) => {
            const parent = el.parentElement;
            return parent ? Array.from(parent.children).indexOf(el) : -1;
        });
        const tableIndex = await container.locator('.hcg-table').evaluate((el) => {
            const parent = el.parentElement;
            return parent ? Array.from(parent.children).indexOf(el) : -1;
        });
        expect(paginationIndex).toBeLessThan(tableIndex);

        // Test bottom position (default)
        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    position: 'bottom'
                }
            });
        });

        // Verify the DOM order: pagination should be after table
        const paginationIndexAfter = await container.locator('.hcg-pagination').evaluate((el) => {
            const parent = el.parentElement;
            return parent ? Array.from(parent.children).indexOf(el) : -1;
        });
        const tableIndexAfter = await container.locator('.hcg-table').evaluate((el) => {
            const parent = el.parentElement;
            return parent ? Array.from(parent.children).indexOf(el) : -1;
        });
        expect(paginationIndexAfter).toBeGreaterThan(tableIndexAfter);

        // Test footer position
        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    enabled: true,
                    position: 'footer',
                    pageSize: 10
                }
            });
        });

        // Check that tfoot element exists and contains pagination
        await expect(page.locator('.hcg-table tfoot')).toBeVisible();
        await expect(page.locator('.hcg-table tfoot .hcg-pagination')).toBeVisible();
    });

    test('Alignment classes - left', async ({ page }) => {
        const pagination = page.locator('.hcg-pagination');

        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    position: 'bottom',
                    align: 'left'
                }
            });
        });

        await expect(pagination).toHaveClass(/\bhcg-pagination-left\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-center\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-right\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-distributed\b/);
    });

    test('Alignment classes - center', async ({ page }) => {
        const pagination = page.locator('.hcg-pagination');

        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    align: 'center'
                }
            });
        });

        await expect(pagination).toHaveClass(/\bhcg-pagination-center\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-left\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-right\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-distributed\b/);
    });

    test('Alignment classes - right', async ({ page }) => {
        const pagination = page.locator('.hcg-pagination');

        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    align: 'right'
                }
            });
        });

        await expect(pagination).toHaveClass(/\bhcg-pagination-right\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-left\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-center\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-distributed\b/);
    });

    test('Alignment classes - distributed', async ({ page }) => {
        const pagination = page.locator('.hcg-pagination');

        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    align: 'distributed'
                }
            });
        });

        await expect(pagination).toHaveClass(/\bhcg-pagination-distributed\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-left\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-center\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-right\b/);
    });

    test('Alignment classes - undefined', async ({ page }) => {
        const pagination = page.locator('.hcg-pagination');

        await page.evaluate(() => {
            (window as any).Grid.grids[0].update({
                pagination: {
                    align: undefined
                }
            });
        });

        await expect(pagination).not.toHaveClass(/\bhcg-pagination-left\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-center\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-right\b/);
        await expect(pagination).not.toHaveClass(/\bhcg-pagination-distributed\b/);
    });

    test('Pinning on last page keeps grid height stable', async ({ page }) => {
        await page.goto('/grid-pro/basic/overview', {
            waitUntil: 'networkidle'
        });

        await page.waitForFunction(() => {
            return typeof (window as any).Grid !== 'undefined' &&
                (window as any).Grid.grids &&
                (window as any).Grid.grids.length > 0;
        });

        const state = await page.evaluate(async () => {
            const grid = (window as any).Grid.grids[0];
            const rows = Array.from({ length: 254 }, (_, i) => ({
                ID: i + 1,
                Name: `Row ${i + 1}`
            }));
            const host = document.getElementById('container');

            if (host) {
                host.style.height = '520px';
            }

            await grid.update({
                dataTable: {
                    columns: {
                        ID: rows.map((row) => row.ID),
                        Name: rows.map((row) => row.Name)
                    }
                },
                pagination: {
                    enabled: true,
                    pageSize: 10,
                    page: 1
                },
                rendering: {
                    rows: {
                        pinning: {
                            idColumn: 'ID'
                        }
                    }
                }
            });
            const getHeight = (element: HTMLElement | null): number =>
                Math.round(element?.getBoundingClientRect().height || 0);

            await grid.update({
                pagination: {
                    page: 26
                }
            });

            const beforePin = {
                hostHeight: getHeight(host),
                gridHeight: getHeight(grid.container),
                tableHeight: getHeight(grid.viewport.tableElement)
            };

            await grid.rowPinning.pin(250, 'top');

            return {
                beforePin,
                afterPin: {
                    hostHeight: getHeight(host),
                    gridHeight: getHeight(grid.container),
                    tableHeight: getHeight(grid.viewport.tableElement)
                }
            };
        });

        expect(state.afterPin.hostHeight).toBe(state.beforePin.hostHeight);
        expect(state.afterPin.gridHeight).toBe(state.beforePin.gridHeight);
        expect(state.afterPin.tableHeight).toBe(state.beforePin.tableHeight);
    });

    test('Pinned rows are counted in pagination page size', async ({ page }) => {
        await page.goto('/grid-pro/basic/overview', {
            waitUntil: 'networkidle'
        });

        const state = await page.evaluate(async () => {
            const grid = (window as any).Grid.grids[0];
            const rows = Array.from({ length: 30 }, (_, i) => ({
                ID: i,
                Name: `Row ${i}`
            }));

            await grid.update({
                dataTable: {
                    columns: {
                        ID: rows.map((row) => row.ID),
                        Name: rows.map((row) => row.Name)
                    }
                },
                pagination: {
                    enabled: true,
                    pageSize: 10,
                    page: 1
                },
                rendering: {
                    rows: {
                        virtualization: false,
                        pinning: {
                            idColumn: 'ID'
                        }
                    }
                }
            });

            const getScrollableIds = (): string[] => Array.from(
                document.querySelectorAll(
                    'tbody.hcg-tbody-scrollable td[data-column-id="ID"]'
                )
            ).map((el): string => (el.textContent || '').trim());

            const beforePin = {
                top: grid.viewport.pinnedTopRows.length,
                scrollable: grid.viewport.rows.length,
                bottom: grid.viewport.pinnedBottomRows.length
            };

            await grid.rowPinning.pin(0, 'top');

            const afterTopPin = {
                top: grid.viewport.pinnedTopRows.length,
                scrollable: grid.viewport.rows.length,
                bottom: grid.viewport.pinnedBottomRows.length,
                scrollableIds: getScrollableIds()
            };

            await grid.rowPinning.pin(1, 'bottom');

            const afterBottomPin = {
                top: grid.viewport.pinnedTopRows.length,
                scrollable: grid.viewport.rows.length,
                bottom: grid.viewport.pinnedBottomRows.length
            };

            return {
                beforePin,
                afterTopPin,
                afterBottomPin
            };
        });

        expect(state.beforePin.top).toBe(0);
        expect(state.beforePin.scrollable).toBe(10);
        expect(state.beforePin.bottom).toBe(0);

        expect(state.afterTopPin.top).toBe(1);
        expect(state.afterTopPin.scrollable).toBe(9);
        expect(state.afterTopPin.bottom).toBe(0);
        expect(state.afterTopPin.scrollableIds).not.toContain('11');

        expect(state.afterBottomPin.top).toBe(1);
        expect(state.afterBottomPin.scrollable).toBe(8);
        expect(state.afterBottomPin.bottom).toBe(1);
    });
});
