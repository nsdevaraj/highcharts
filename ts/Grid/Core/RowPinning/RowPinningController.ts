/* *
 *
 *  Grid Row Pinning controller
 *
 *  (c) 2020-2026 Highsoft AS
 *
 *  A commercial license may be required depending on use.
 *  See www.highcharts.com/license
 *
 *
 *  Author:
 *  - Mikkel Espolin Birkeland
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */

import type Grid from '../../Core/Grid';
import type Options from '../../Core/Options';
import type { RowId as DataProviderRowId } from '../Data/DataProvider';

import { erase, isNumber, isString } from '../../../Shared/Utilities.js';

/* *
 *
 *  Declarations
 *
 * */

export type RowId = DataProviderRowId;
export type RowPinningPosition = 'top'|'bottom';
export type GridRowPinningOptions = NonNullable<
    NonNullable<
        NonNullable<Options['rendering']>['rows']
    >['pinning']
>;

/**
 * Snapshot of pinned row IDs by section.
 */
export interface RowPinningState {
    topIds: RowId[];
    bottomIds: RowId[];
}

/**
 * Returns whether row pinning was explicitly configured by the user.
 *
 * @param grid
 * Grid instance options container.
 */
export function hasConfiguredGridRowPinningOptions(
    grid: Pick<Grid, 'userOptions'>
): boolean {
    return grid.userOptions?.rendering?.rows?.pinning !== void 0;
}

/**
 * Returns merged row pinning options from the grid.
 *
 * @param grid
 * Grid instance options container.
 */
export function getGridRowPinningOptions(
    grid: Pick<Grid, 'options'>
): (GridRowPinningOptions | undefined) {
    return grid.options?.rendering?.rows?.pinning;
}

/* *
 *
 *  Class
 *
 * */

class RowPinningController {

    public readonly grid: Grid;

    private topRowIds: RowId[] = [];

    private bottomRowIds: RowId[] = [];

    private resolvedTopRowIds: RowId[] = [];

    private resolvedBottomRowIds: RowId[] = [];

    private explicitUnpinned: Set<RowId> = new Set();

    private optionsDirty = true;

    constructor(grid: Grid) {
        this.grid = grid;
    }

    public getPinningOptions(): ReturnType<typeof getGridRowPinningOptions> {
        return getGridRowPinningOptions(this.grid);
    }

    private clearState(clearExplicitUnpinned: boolean = false): void {
        this.topRowIds.length = 0;
        this.bottomRowIds.length = 0;
        this.resolvedTopRowIds.length = 0;
        this.resolvedBottomRowIds.length = 0;

        if (clearExplicitUnpinned) {
            this.explicitUnpinned.clear();
        }
    }

    private static normalizeSections(
        topIds: RowId[],
        bottomIds: RowId[]
    ): { topIds: RowId[]; bottomIds: RowId[] } {
        const uniqueTopIds = RowPinningController.uniqueRowIds(topIds);
        const topSet = new Set(uniqueTopIds);
        const uniqueBottomIds = RowPinningController.uniqueRowIds(bottomIds)
            .filter((rowId): boolean => !topSet.has(rowId));

        return {
            topIds: uniqueTopIds,
            bottomIds: uniqueBottomIds
        };
    }

    private getExplicitPinnedRows(): { topIds: RowId[]; bottomIds: RowId[] } {
        return RowPinningController.normalizeSections(
            this.topRowIds,
            this.bottomRowIds
        );
    }

    public loadOptions(): void {
        if (!this.optionsDirty) {
            return;
        }

        this.optionsDirty = false;
        const pinningOptions = this.getPinningOptions();
        const top = pinningOptions?.topIds || [];
        const bottom = pinningOptions?.bottomIds || [];

        if (!this.isOptionEnabled()) {
            this.clearState(true);
            return;
        }

        const normalized = RowPinningController.normalizeSections(top, bottom);

        this.topRowIds = normalized.topIds;
        this.bottomRowIds = normalized.bottomIds;
        this.resolvedTopRowIds.length = 0;
        this.resolvedBottomRowIds.length = 0;
    }

    public markOptionsDirty(): void {
        this.optionsDirty = true;
    }

    public isEnabled(): boolean {
        this.loadOptions();

        if (!this.isOptionEnabled()) {
            return false;
        }

        const explicit = this.getExplicitPinnedRows();
        const pinningOptions = this.getPinningOptions();
        return !!(
            explicit.topIds.length ||
            explicit.bottomIds.length ||
            this.resolvedTopRowIds.length ||
            this.resolvedBottomRowIds.length ||
            pinningOptions?.resolve
        );
    }

    public isOptionEnabled(): boolean {
        return this.getPinningOptions()?.enabled !== false;
    }

    public pinRow(
        rowId: RowId,
        position: RowPinningPosition = 'top',
        index?: number
    ): void {
        this.loadOptions();
        if (!this.isOptionEnabled()) {
            return;
        }

        this.explicitUnpinned.delete(rowId);
        const next = this.previewPinnedRowsChange(
            this.getExplicitPinnedRows(),
            'pin',
            rowId,
            position,
            index
        );

        this.topRowIds = next.topIds;
        this.bottomRowIds = next.bottomIds;
    }

    public unpinRow(rowId: RowId): void {
        this.loadOptions();
        if (!this.isOptionEnabled()) {
            return;
        }

        const next = this.previewPinnedRowsChange(
            this.getExplicitPinnedRows(),
            'unpin',
            rowId
        );
        this.topRowIds = next.topIds;
        this.bottomRowIds = next.bottomIds;
        this.explicitUnpinned.add(rowId);
    }

    public previewPinnedRowsChange(
        previous: RowPinningState,
        action: 'pin'|'unpin',
        rowId: RowId,
        position: RowPinningPosition = 'top',
        index?: number
    ): RowPinningState {
        const topIds = previous.topIds.slice();
        const bottomIds = previous.bottomIds.slice();
        const source = position === 'top' ? topIds : bottomIds;
        const other = position === 'top' ? bottomIds : topIds;

        const sourceIndex = source.indexOf(rowId);
        if (sourceIndex !== -1) {
            erase(source, rowId);
        }

        const otherIndex = other.indexOf(rowId);
        if (otherIndex !== -1) {
            erase(other, rowId);
        }

        if (action === 'pin') {
            if (typeof index === 'number' && index >= 0) {
                source.splice(Math.min(index, source.length), 0, rowId);
            } else {
                source.push(rowId);
            }
        }

        return { topIds, bottomIds };
    }

    public setResolvedIds(topIds: RowId[], bottomIds: RowId[]): void {
        const normalized = RowPinningController.normalizeSections(
            topIds,
            bottomIds
        );

        this.resolvedTopRowIds = normalized.topIds;
        this.resolvedBottomRowIds = normalized.bottomIds;
    }

    public pruneMissingExplicitIds(rowIds: RowId[]): void {
        if (!rowIds.length) {
            return;
        }

        const missing = new Set(rowIds);
        this.topRowIds = this.topRowIds.filter((rowId): boolean =>
            !missing.has(rowId)
        );
        this.bottomRowIds = this.bottomRowIds.filter((rowId): boolean =>
            !missing.has(rowId)
        );
    }

    public getPinnedRows(): { topIds: RowId[]; bottomIds: RowId[] } {
        this.loadOptions();

        if (!this.isOptionEnabled()) {
            return {
                topIds: [],
                bottomIds: []
            };
        }

        const normalized = RowPinningController.normalizeSections(
            [
                ...this.topRowIds,
                ...this.resolvedTopRowIds
            ],
            [
                ...this.bottomRowIds,
                ...this.resolvedBottomRowIds
            ]
        );

        const topIds = normalized.topIds.filter((rowId): boolean =>
            !this.explicitUnpinned.has(rowId)
        );
        const topSet = new Set(topIds);
        const bottomIds = normalized.bottomIds.filter((rowId): boolean =>
            !this.explicitUnpinned.has(rowId) && !topSet.has(rowId)
        );

        return {
            topIds,
            bottomIds
        };
    }

    /**
     * Recompute resolve()-based pinned IDs from materialized provider rows.
     */
    public async recomputeResolvedFromMaterializedRows(): Promise<void> {
        if (!this.isOptionEnabled()) {
            return;
        }

        const resolve = this.getPinningOptions()?.resolve;
        const dataProvider = this.grid.dataProvider;
        if (!resolve || !dataProvider) {
            this.setResolvedIds([], []);
            return;
        }

        const explicit = this.getExplicitPinnedRows();
        const used = new Set<RowId>([
            ...explicit.topIds,
            ...explicit.bottomIds
        ]);
        const topResolved: RowId[] = [];
        const bottomResolved: RowId[] = [];

        const rowCount = await dataProvider.getRowCount();

        for (let i = 0; i < rowCount; ++i) {
            const rowId = await dataProvider.getRowId(i);
            const row = await dataProvider.getRowObject(i);
            if (rowId === void 0 || !row) {
                continue;
            }

            if (used.has(rowId) || this.explicitUnpinned.has(rowId)) {
                continue;
            }

            let position: ('top'|'bottom'|null|undefined);
            try {
                position = resolve(row);
            } catch {
                continue;
            }

            if (position === 'top') {
                topResolved.push(rowId);
                used.add(rowId);
            } else if (position === 'bottom') {
                bottomResolved.push(rowId);
                used.add(rowId);
            }
        }

        this.setResolvedIds(topResolved, bottomResolved);
        const pinned = this.getPinnedRows();
        await dataProvider.primePinnedRows([
            ...pinned.topIds,
            ...pinned.bottomIds
        ]);
    }

    /**
     * Handle missing pinned row IDs after pinned-row render.
     *
     * @param result
     * Render result payload with missing pinned IDs.
     *
     * @param result.missingPinnedRowIds
     * Missing pinned row IDs from the latest render pass.
     *
     * @param source
     * Render source that triggered reconciliation.
     */
    public async handlePinnedRenderResult(
        result: { missingPinnedRowIds: RowId[] },
        source: 'query'|'runtime'
    ): Promise<void> {
        if (!result.missingPinnedRowIds.length) {
            return;
        }

        const isRemote = this.grid.options?.data?.providerType === 'remote';
        if (isRemote) {
            if (source === 'query') {
                await this.grid.dataProvider?.primePinnedRows(
                    result.missingPinnedRowIds
                );
            }
            return;
        }

        if (source === 'query') {
            this.pruneMissingExplicitIds(result.missingPinnedRowIds);
        }
    }

    private static uniqueRowIds(values: unknown[]): RowId[] {
        const result: RowId[] = [];
        const seen = new Set<RowId>();

        for (const value of values) {
            if (!isNumber(value) && !isString(value)) {
                continue;
            }

            if (seen.has(value)) {
                continue;
            }

            seen.add(value);
            result.push(value);
        }

        return result;
    }
}

/* *
 *
 *  Default Export
 *
 * */

export default RowPinningController;
