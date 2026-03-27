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
import type { GridEvent } from '../../Core/GridUtils';
import type DataTable from '../../../Data/DataTable';
import type {
    RowObject as RowObjectType,
    CellType as DataTableCellType
} from '../../../Data/DataTable';
import type { RowId as DataProviderRowId } from '../Data/DataProvider';

import { formatText } from '../../Core/GridUtils.js';
import {
    erase,
    fireEvent,
    isNumber,
    isString
} from '../../../Shared/Utilities.js';

/* *
 *
 *  Declarations
 *
 * */

export type RowId = DataProviderRowId;
export type RowPinningPosition = 'top'|'bottom';
export type RowPinningChangeAction = 'pin'|'unpin'|'toggle';

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

export interface RowPinningChangeEvent {
    rowId: RowId;
    action: RowPinningChangeAction;
    position?: RowPinningPosition;
    index?: number;
    changed: boolean;
    previousTopIds: RowId[];
    previousBottomIds: RowId[];
    topIds: RowId[];
    bottomIds: RowId[];
}

export type RowPinningChangeEventCallback = (
    this: Grid,
    e: GridEvent<Grid> & RowPinningChangeEvent
) => void;

export interface RowPinningEvents {
    beforeRowPin?: RowPinningChangeEventCallback;
    afterRowPin?: RowPinningChangeEventCallback;
}

export interface RowPinningSectionOptions {
    /**
     * Maximum height for this pinned tbody. Enables vertical scrolling in the
     * pinned section when content exceeds this height.
     */
    maxHeight?: number|string;
}

export interface RowPinningOptions {
    enabled?: boolean;
    idColumn?: string;
    topIds?: RowId[];
    bottomIds?: RowId[];
    top?: RowPinningSectionOptions;
    bottom?: RowPinningSectionOptions;
    events?: RowPinningEvents;
    resolve?: (row: RowObjectType) => ('top'|'bottom'|null|undefined);
}

declare module '../../Core/Options' {
    interface LangOptions {
        pinRowTop?: string;
        pinRowBottom?: string;
        unpinRow?: string;
    }

    interface RowsSettings {
        pinning?: RowPinningOptions;
    }
}

declare module '../../Core/Grid' {
    export default interface Grid {
        rowPinning?: RowPinningController;
    }
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

/**
 * Compare row id arrays by value and order.
 *
 * @param a
 * First row id array.
 *
 * @param b
 * Second row id array.
 */
function sameIds(a: RowId[], b: RowId[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0, iEnd = a.length; i < iEnd; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

/**
 * Returns whether two pinned row states differ.
 *
 * @param previous
 * Previous pinned row state.
 *
 * @param next
 * Next pinned row state.
 */
function didPinnedRowsChange(
    previous: RowPinningState,
    next: RowPinningState
): boolean {
    return (
        !sameIds(previous.topIds, next.topIds) ||
        !sameIds(previous.bottomIds, next.bottomIds)
    );
}

/**
 * Stores row pinning state from two sources:
 * - explicit pinned ids from config/runtime API
 * - resolved pinned ids produced by `pinning.resolve`
 *
 * The effective pinned state is the normalized combination of both, minus
 * rows explicitly unpinned at runtime.
 */
class RowPinningController {

    public readonly grid: Grid;

    private topRowIds: RowId[] = [];

    private bottomRowIds: RowId[] = [];

    private resolvedTopRowIds: RowId[] = [];

    private resolvedBottomRowIds: RowId[] = [];

    private explicitUnpinned: Set<RowId> = new Set();

    private pinnedRowObjects: Map<RowId, RowObjectType> = new Map();

    private optionsDirty = true;

    constructor(grid: Grid) {
        this.grid = grid;
    }

    public getPinningOptions(): ReturnType<typeof getGridRowPinningOptions> {
        return getGridRowPinningOptions(this.grid);
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
        this.syncPinnedRowObjects();
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

    public async pin(
        rowId: RowId,
        position: RowPinningPosition = 'top',
        index?: number
    ): Promise<void> {
        if (!this.isOptionEnabled()) {
            return;
        }

        const previous = this.getPinnedRows();
        const eventPayload = this.createChangeEvent(
            previous,
            'pin',
            rowId,
            'pin',
            position,
            index
        );

        await this.runRuntimeChange(
            eventPayload,
            async (): Promise<void> => {
                await this.applyPin(rowId, position, index);
            },
            'pin',
            position
        );
    }

    public async toggle(
        rowId: RowId,
        position: RowPinningPosition = 'top'
    ): Promise<void> {
        if (!this.isOptionEnabled()) {
            return;
        }

        const previous = this.getPinnedRows();
        const isPinned = (
            previous.topIds.includes(rowId) ||
            previous.bottomIds.includes(rowId)
        );
        const nextAction = isPinned ? 'unpin' : 'pin';
        const eventPayload = this.createChangeEvent(
            previous,
            'toggle',
            rowId,
            nextAction,
            isPinned ? void 0 : position
        );

        await this.runRuntimeChange(
            eventPayload,
            async (): Promise<void> => {
                if (isPinned) {
                    this.applyUnpin(rowId);
                } else {
                    await this.applyPin(rowId, position);
                }
            },
            isPinned ? 'unpin' : 'pin',
            isPinned ? void 0 : position
        );
    }

    public async unpin(rowId: RowId): Promise<void> {
        if (!this.isOptionEnabled()) {
            return;
        }

        const previous = this.getPinnedRows();
        const eventPayload = this.createChangeEvent(
            previous,
            'unpin',
            rowId,
            'unpin'
        );

        await this.runRuntimeChange(
            eventPayload,
            (): void => {
                this.applyUnpin(rowId);
            },
            'unpin'
        );
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

        erase(source, rowId);
        erase(other, rowId);

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
        this.syncPinnedRowObjects();
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
        this.syncPinnedRowObjects();
    }

    public getPinnedRows(): RowPinningState {
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

    public getPinnedRowObject(rowId: RowId): RowObjectType | undefined {
        return this.pinnedRowObjects.get(rowId);
    }

    public ensurePinnedRowsAvailable(rowIds: RowId[]): Promise<{
        hydratedRowIds: RowId[];
        definitiveMissingRowIds: RowId[];
    }> {
        const hydratedRowIds: RowId[] = [];
        const definitiveMissingRowIds: RowId[] = [];

        if (!rowIds.length) {
            return Promise.resolve({
                hydratedRowIds,
                definitiveMissingRowIds
            });
        }

        const dataProvider = this.grid.dataProvider;
        const dataTable = this.grid.dataTable;
        const dataOptions = this.grid.options?.data as (
            { idColumn?: string } | undefined
        );
        const idColumn = dataOptions?.idColumn;
        const sourceRowIndexesMap = (
            dataTable && idColumn ?
                this.getSourceRowIndexesMap(dataTable, idColumn) :
                void 0
        );

        for (const rowId of RowPinningController.uniqueRowIds(rowIds)) {
            if (this.pinnedRowObjects.has(rowId)) {
                continue;
            }

            const row =
                dataProvider?.getCachedRowObjectById(rowId) ||
                this.getSourceRowObjectById(
                    rowId,
                    dataTable,
                    idColumn,
                    sourceRowIndexesMap
                );

            if (row) {
                this.pinnedRowObjects.set(rowId, row);
                hydratedRowIds.push(rowId);
            } else if (
                this.canDeterminePinnedRowAbsence(
                    rowId,
                    dataTable,
                    idColumn,
                    sourceRowIndexesMap
                )
            ) {
                definitiveMissingRowIds.push(rowId);
            } else {
                this.pinnedRowObjects.delete(rowId);
            }
        }

        this.syncPinnedRowObjects();

        return Promise.resolve({
            hydratedRowIds,
            definitiveMissingRowIds
        });
    }

    public updatePinnedRowValue(
        rowId: RowId,
        columnId: string,
        value: DataTableCellType
    ): void {
        const row = this.pinnedRowObjects.get(rowId);

        if (row) {
            row[columnId] = value;
        }
    }

    public invalidatePinnedRowObjects(): void {
        this.pinnedRowObjects.clear();
    }

    public async recomputeResolvedFromMaterializedRows(): Promise<void> {
        if (!this.isOptionEnabled()) {
            return;
        }

        const resolve = this.getPinningOptions()?.resolve;
        const dataProvider = this.grid.dataProvider;
        if (!dataProvider) {
            this.setResolvedIds([], []);
            return;
        }

        if (!resolve) {
            this.setResolvedIds([], []);
            const pinned = this.getPinnedRows();
            await this.ensurePinnedRowsAvailable([
                ...pinned.topIds,
                ...pinned.bottomIds
            ]);
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
        await this.ensurePinnedRowsAvailable([
            ...pinned.topIds,
            ...pinned.bottomIds
        ]);
    }

    public async handlePinnedRenderResult(
        result: { missingPinnedRowIds: RowId[] },
        source: 'query'|'runtime'
    ): Promise<void> {
        void source;

        if (!result.missingPinnedRowIds.length) {
            return;
        }

        const {
            hydratedRowIds,
            definitiveMissingRowIds
        } = await this.ensurePinnedRowsAvailable(result.missingPinnedRowIds);

        if (definitiveMissingRowIds.length) {
            this.pruneMissingExplicitIds(definitiveMissingRowIds);
        }

        if (
            this.grid.viewport &&
            (hydratedRowIds.length || definitiveMissingRowIds.length)
        ) {
            await this.grid.viewport.renderPinnedRows(true);
        }
    }

    private clearState(clearExplicitUnpinned: boolean = false): void {
        this.topRowIds.length = 0;
        this.bottomRowIds.length = 0;
        this.resolvedTopRowIds.length = 0;
        this.resolvedBottomRowIds.length = 0;
        this.pinnedRowObjects.clear();

        if (clearExplicitUnpinned) {
            this.explicitUnpinned.clear();
        }
    }

    private getExplicitPinnedRows(): RowPinningState {
        return RowPinningController.normalizeSections(
            this.topRowIds,
            this.bottomRowIds
        );
    }

    private async applyPin(
        rowId: RowId,
        position: RowPinningPosition = 'top',
        index?: number
    ): Promise<void> {
        this.loadOptions();
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
        await this.ensurePinnedRowsAvailable([rowId]);
    }

    private applyUnpin(rowId: RowId): void {
        this.loadOptions();
        const next = this.previewPinnedRowsChange(
            this.getExplicitPinnedRows(),
            'unpin',
            rowId
        );

        this.topRowIds = next.topIds;
        this.bottomRowIds = next.bottomIds;
        this.explicitUnpinned.add(rowId);
        this.pinnedRowObjects.delete(rowId);
    }

    private createChangeEvent(
        previous: RowPinningState,
        action: RowPinningChangeAction,
        rowId: RowId,
        nextAction: 'pin'|'unpin',
        position?: RowPinningPosition,
        index?: number
    ): RowPinningChangeEvent {
        const next = this.previewPinnedRowsChange(
            previous,
            nextAction,
            rowId,
            position,
            index
        );

        return {
            rowId,
            action,
            position,
            index,
            changed: didPinnedRowsChange(previous, next),
            previousTopIds: previous.topIds.slice(),
            previousBottomIds: previous.bottomIds.slice(),
            topIds: next.topIds.slice(),
            bottomIds: next.bottomIds.slice()
        };
    }

    private async runRuntimeChange(
        eventPayload: RowPinningChangeEvent,
        applyChange: () => Promise<void> | void,
        announcementAction: 'pin'|'unpin',
        announcementPosition?: RowPinningPosition
    ): Promise<void> {
        const { grid } = this;

        fireEvent(grid, 'beforeRowPin', eventPayload);
        this.callEventCallback('beforeRowPin', eventPayload);

        await applyChange();

        if (grid.viewport && grid.querying.pagination.enabled) {
            await grid.viewport.rowsVirtualizer.refreshRows();
        }

        const renderResult = grid.viewport ?
            await grid.viewport.renderPinnedRows(true) :
            { missingPinnedRowIds: [] };

        await this.handlePinnedRenderResult(renderResult, 'runtime');
        grid.viewport?.reflow();

        if (
            announcementAction === 'pin' &&
            eventPayload.changed &&
            eventPayload.position
        ) {
            grid.viewport?.revealPinnedRowInSection(
                eventPayload.rowId,
                eventPayload.position
            );
        }

        fireEvent(grid, 'afterRowPin', eventPayload);
        this.callEventCallback('afterRowPin', eventPayload);

        if (eventPayload.changed) {
            this.announceChange(
                announcementAction,
                eventPayload.rowId,
                announcementPosition
            );
        }
    }

    private callEventCallback(
        eventName: 'beforeRowPin'|'afterRowPin',
        eventPayload: RowPinningChangeEvent
    ): void {
        const callback = this.getPinningOptions()?.events?.[eventName];

        if (!callback) {
            return;
        }

        callback.call(this.grid, {
            target: this.grid,
            ...eventPayload
        } as (GridEvent<Grid> & RowPinningChangeEvent));
    }

    private announceChange(
        action: 'pin'|'unpin',
        rowId: RowId,
        position?: RowPinningPosition
    ): void {
        const { grid } = this;

        if (!grid.options?.accessibility?.announcements?.rowPinning) {
            return;
        }

        const lang = grid.options?.lang?.accessibility?.rowPinning
            ?.announcements;
        let msg: string | undefined;

        if (action === 'pin' && position) {
            msg = formatText(lang?.pinned || '', {
                rowId: String(rowId),
                position
            });
        } else {
            msg = formatText(lang?.unpinned || '', {
                rowId: String(rowId)
            });
        }

        if (msg) {
            grid.accessibility?.announce(msg, true);
        }
    }

    /**
     * Prunes cached pinned row objects for rows that are no longer pinned.
     *
     * @param state
     * Explicit pinned state snapshot. When omitted, the current state is used.
     */
    private syncPinnedRowObjects(state?: RowPinningState): void {
        const pinned = state || this.getPinnedRows();
        const activeIds = new Set<RowId>([
            ...pinned.topIds,
            ...pinned.bottomIds
        ]);

        for (const rowId of this.pinnedRowObjects.keys()) {
            if (!activeIds.has(rowId)) {
                this.pinnedRowObjects.delete(rowId);
            }
        }
    }

    private getSourceRowObjectById(
        rowId: RowId,
        dataTable?: DataTable,
        idColumn?: string,
        sourceRowIndexesMap?: Map<RowId, number>
    ): RowObjectType | undefined {
        const rowIndex = this.getSourceRowIndexById(
            rowId,
            dataTable,
            idColumn,
            sourceRowIndexesMap
        );

        if (!dataTable || rowIndex === void 0) {
            return;
        }

        return dataTable.getRowObject(rowIndex);
    }

    private getSourceRowIndexById(
        rowId: RowId,
        dataTable?: DataTable,
        idColumn?: string,
        sourceRowIndexesMap?: Map<RowId, number>
    ): number | undefined {
        if (!dataTable) {
            return;
        }

        if (idColumn) {
            return sourceRowIndexesMap?.get(rowId);
        }

        if (isNumber(rowId)) {
            return rowId;
        }
    }

    private getSourceRowIndexesMap(
        dataTable: DataTable,
        idColumn: string
    ): Map<RowId, number> | undefined {
        const idColumnValues = dataTable.getColumn(idColumn, true) as
            Array<RowId | undefined> | undefined;

        if (!idColumnValues) {
            return;
        }

        const rowIndexes = new Map<RowId, number>();

        for (let i = 0, iEnd = idColumnValues.length; i < iEnd; ++i) {
            const rowId = idColumnValues[i];

            if (isString(rowId) || isNumber(rowId)) {
                rowIndexes.set(rowId, i);
            }
        }

        return rowIndexes;
    }

    private canDeterminePinnedRowAbsence(
        rowId: RowId,
        dataTable?: DataTable,
        idColumn?: string,
        sourceRowIndexesMap?: Map<RowId, number>
    ): boolean {
        if (!dataTable) {
            return false;
        }

        if (idColumn) {
            return !!sourceRowIndexesMap;
        }

        return isNumber(rowId);
    }

    private static normalizeSections(
        topIds: RowId[],
        bottomIds: RowId[]
    ): RowPinningState {
        const uniqueTopIds = RowPinningController.uniqueRowIds(topIds);
        const topSet = new Set(uniqueTopIds);
        const uniqueBottomIds = RowPinningController.uniqueRowIds(bottomIds)
            .filter((rowId): boolean => !topSet.has(rowId));

        return {
            topIds: uniqueTopIds,
            bottomIds: uniqueBottomIds
        };
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

export default RowPinningController;
