/* *
 *
 *  Grid Tree Sticky Row Controller
 *
 *  (c) 2020-2026 Highsoft AS
 *
 *  A commercial license may be required depending on use.
 *  See www.highcharts.com/license
 * */

'use strict';


/* *
 *
 *  Imports
 *
 * */

import type { RowId } from '../../Core/Data/DataProvider';
import type Table from '../../Core/Table/Table';
import type { TreeProjectionState } from './TreeViewTypes';

import TableRow from '../../Core/Table/Body/TableRow.js';
import Globals from '../../Core/Globals.js';


/* *
 *
 *  Declarations
 *
 * */

type StickyCandidate = {
    lastDescendantId: RowId;
    lastDescendantIndex: number;
    rowId: RowId;
    rowIndex: number;
};

const stickyRowClassName = Globals.classNamePrefix + 'tree-sticky-row';
const stickyBodyClassName = Globals.classNamePrefix + 'tree-sticky-body';


/* *
 *
 *  Class
 *
 * */

class TreeStickyRowController {

    /* *
     *
     *  Properties
     *
     * */

    private readonly viewport: Table;

    private activeRowIds: RowId[] = [];

    private animationFrameId?: number;

    private needsRowReflow = false;

    private needsRowSync = false;

    private refreshToken = 0;

    private stickyRows: TableRow[] = [];

    private stickyBodyElement?: HTMLTableSectionElement;

    private ownsTablePosition = false;


    /* *
     *
     *  Constructor
     *
     * */

    constructor(viewport: Table) {
        this.viewport = viewport;
    }


    /* *
     *
     *  Methods
     *
     * */

    public destroy(): void {
        if (typeof this.animationFrameId === 'number') {
            cancelAnimationFrame(this.animationFrameId);
            delete this.animationFrameId;
        }

        this.clearStickyRows();
        this.destroyStickyBody();
    }

    public getRenderedStickyRow(): TableRow | undefined {
        return this.stickyRows[0];
    }

    public getRenderedStickyRows(): TableRow[] {
        return this.stickyRows;
    }

    public getStickyRowsHeight(): number {
        return this.stickyRows.reduce(
            (height, row): number =>
                height + (
                    row.htmlElement.offsetHeight ||
                    this.viewport.rowsVirtualizer.defaultRowHeight
                ),
            0
        );
    }

    public getStickyBodyElement(): HTMLTableSectionElement {
        return this.ensureStickyBody();
    }

    public handleScroll(): void {
        const candidates = this.getCurrentCandidates();

        if (!candidates.length) {
            this.clearStickyRows();
            return;
        }

        if (
            this.stickyRows.length === candidates.length &&
            this.areSameActiveRowIds(candidates)
        ) {
            this.positionStickyRows(candidates);
            return;
        }

        this.scheduleRefresh(true);
    }

    public scheduleRefresh(
        syncRow: boolean = false,
        reflowRow: boolean = false
    ): void {
        this.needsRowSync = this.needsRowSync || syncRow;
        this.needsRowReflow = this.needsRowReflow || reflowRow;

        if (typeof this.animationFrameId === 'number') {
            return;
        }

        this.animationFrameId = requestAnimationFrame((): void => {
            delete this.animationFrameId;
            void this.refresh();
        });
    }

    private areSameActiveRowIds(candidates: StickyCandidate[]): boolean {
        if (this.activeRowIds.length !== candidates.length) {
            return false;
        }

        for (let i = 0, iEnd = candidates.length; i < iEnd; ++i) {
            if (this.activeRowIds[i] !== candidates[i].rowId) {
                return false;
            }
        }

        return true;
    }

    private clearStickyRows(): void {
        ++this.refreshToken;
        this.activeRowIds.length = 0;

        if (this.stickyBodyElement) {
            this.stickyBodyElement.style.height = '0';
        }

        if (!this.stickyRows.length) {
            return;
        }

        for (let i = 0, iEnd = this.stickyRows.length; i < iEnd; ++i) {
            this.stickyRows[i].destroy();
        }

        this.stickyRows.length = 0;
    }

    private destroyStickyBody(): void {
        if (this.stickyBodyElement) {
            this.stickyBodyElement.remove();
            delete this.stickyBodyElement;
        }

        if (this.ownsTablePosition) {
            this.viewport.tableElement.style.position = '';
            this.ownsTablePosition = false;
        }
    }

    private ensureStickyBody(): HTMLTableSectionElement {
        let stickyBodyElement = this.stickyBodyElement;

        if (stickyBodyElement?.isConnected) {
            return stickyBodyElement;
        }

        stickyBodyElement = document.createElement('tbody');
        stickyBodyElement.className = stickyBodyClassName;
        stickyBodyElement.style.position = 'absolute';
        stickyBodyElement.style.left = '0';
        stickyBodyElement.style.height = '0';
        stickyBodyElement.style.minHeight = '0';
        stickyBodyElement.style.overflow = 'hidden';
        stickyBodyElement.style.display = 'block';
        stickyBodyElement.style.flex = 'none';
        stickyBodyElement.style.pointerEvents = 'none';
        stickyBodyElement.style.zIndex = '3';
        this.viewport.tableElement.insertBefore(
            stickyBodyElement,
            this.viewport.tbodyElement
        );
        this.stickyBodyElement = stickyBodyElement;

        if (
            !this.viewport.tableElement.style.position ||
            this.viewport.tableElement.style.position === 'static'
        ) {
            this.viewport.tableElement.style.position = 'relative';
            this.ownsTablePosition = true;
        }

        return stickyBodyElement;
    }

    private findTopVisibleRow(visibleTop: number): TableRow | undefined {
        const { rows } = this.viewport;

        for (let i = 0, iEnd = rows.length; i < iEnd; ++i) {
            const row = rows[i];
            const rowTop = this.getRowTop(row);
            const rowBottom = rowTop + row.htmlElement.offsetHeight;

            if (rowBottom > visibleTop) {
                return row;
            }
        }

        return rows[rows.length - 1];
    }

    private getRowHeight(rowId: RowId): number | undefined {
        const renderedRow = this.getRenderedViewportRow(rowId);
        if (renderedRow?.htmlElement.offsetHeight) {
            return renderedRow.htmlElement.offsetHeight;
        }

        for (let i = 0, iEnd = this.stickyRows.length; i < iEnd; ++i) {
            if (this.stickyRows[i].id === rowId) {
                return (
                    this.stickyRows[i].htmlElement.offsetHeight ||
                    this.viewport.rowsVirtualizer.defaultRowHeight
                );
            }
        }
    }

    private getCandidateRowHeight(candidate: StickyCandidate): number {
        return this.getRowHeight(candidate.rowId) ||
            this.viewport.rowsVirtualizer.defaultRowHeight;
    }

    private getCandidateRowTop(candidate: StickyCandidate): number | undefined {
        const renderedRow = this.getRenderedViewportRow(candidate.rowId);

        if (renderedRow) {
            return this.getRowTop(renderedRow);
        }

        if (this.viewport.virtualRows) {
            return this.viewport.rowsVirtualizer.getEstimatedRowTop(
                candidate.rowIndex
            );
        }
    }

    private getCurrentCandidates(): StickyCandidate[] {
        const projectionState = this.viewport.grid.treeView
            ?.getProjectionState();

        if (
            !projectionState ||
            !this.viewport.tbodyElement.isConnected ||
            this.viewport.tbodyElement.clientHeight <= 0
        ) {
            return [];
        }

        const activeCandidates: StickyCandidate[] = [];
        let slotTop = this.viewport.tbodyElement.scrollTop;

        for (let i = 0; i < 10; ++i) {
            const topVisibleRow = this.findTopVisibleRow(slotTop);

            if (
                !topVisibleRow ||
                typeof topVisibleRow.id === 'undefined'
            ) {
                break;
            }

            const candidatePath = this.getStickyCandidates(
                topVisibleRow,
                projectionState
            );

            if (
                !this.hasMatchingCandidatePrefix(
                    activeCandidates,
                    candidatePath
                )
            ) {
                break;
            }

            const candidate = candidatePath[activeCandidates.length];
            if (!candidate) {
                break;
            }

            const rowTop = this.getCandidateRowTop(candidate);
            if (
                typeof rowTop !== 'number' ||
                rowTop >= slotTop
            ) {
                break;
            }

            activeCandidates.push(candidate);
            slotTop += this.getCandidateRowHeight(candidate);
        }

        return activeCandidates;
    }

    private getProjectedRowIndex(
        rowId: RowId,
        projectionState: TreeProjectionState,
        topVisibleRow: TableRow
    ): number | undefined {
        if (topVisibleRow.id === rowId) {
            return topVisibleRow.index;
        }

        const renderedRow = this.viewport.getRow(rowId);
        if (renderedRow) {
            return renderedRow.index;
        }

        const projectedRowIndex = projectionState.rowIds.indexOf(rowId);
        if (projectedRowIndex > -1) {
            return projectedRowIndex;
        }
    }

    private getRowTop(row: TableRow): number {
        if (this.viewport.virtualRows) {
            return row.translateY;
        }

        return row.htmlElement.offsetTop;
    }

    private getRenderedViewportRow(rowId: RowId): TableRow | undefined {
        return this.viewport.rows.find((row): boolean => row.id === rowId);
    }

    private getRowBottom(
        rowId: RowId,
        rowIndex: number,
        rowHeight?: number
    ): number | undefined {
        const renderedRow = this.getRenderedViewportRow(rowId);
        const resolvedRowHeight = rowHeight ||
            this.getRowHeight(rowId) ||
            this.viewport.rowsVirtualizer.defaultRowHeight;

        if (renderedRow) {
            return this.getRowTop(renderedRow) +
                renderedRow.htmlElement.offsetHeight;
        }

        if (this.viewport.virtualRows) {
            return this.viewport.rowsVirtualizer.getEstimatedRowBottom(
                rowIndex,
                resolvedRowHeight
            );
        }
    }

    private hasMatchingCandidatePrefix(
        left: StickyCandidate[],
        right: StickyCandidate[]
    ): boolean {
        if (left.length > right.length) {
            return false;
        }

        for (let i = 0, iEnd = left.length; i < iEnd; ++i) {
            if (left[i].rowId !== right[i].rowId) {
                return false;
            }
        }

        return true;
    }

    private getStickyCandidates(
        topVisibleRow: TableRow,
        projectionState: TreeProjectionState
    ): StickyCandidate[] {
        let currentRowId: RowId | null | undefined = topVisibleRow.id;
        const candidates: StickyCandidate[] = [];

        while (currentRowId !== null && typeof currentRowId !== 'undefined') {
            const rowState = projectionState.rowsById.get(currentRowId);
            if (!rowState) {
                return [];
            }

            if (rowState.hasChildren && rowState.isExpanded) {
                const rowIndex = this.getProjectedRowIndex(
                    currentRowId,
                    projectionState,
                    topVisibleRow
                );

                if (typeof rowIndex !== 'number') {
                    return [];
                }

                candidates.push({
                    lastDescendantIndex:
                        this.getProjectedRowIndex(
                            rowState.lastVisibleDescendantId || currentRowId,
                            projectionState,
                            topVisibleRow
                        ) ?? rowIndex,
                    lastDescendantId:
                        rowState.lastVisibleDescendantId || currentRowId,
                    rowId: currentRowId,
                    rowIndex
                });
            }

            currentRowId = rowState.parentId;
        }

        return candidates.reverse();
    }

    private async refresh(): Promise<void> {
        const syncRow = this.needsRowSync;
        const reflowRow = this.needsRowReflow;
        this.needsRowSync = false;
        this.needsRowReflow = false;

        const candidates = this.getCurrentCandidates();
        if (!candidates.length) {
            this.clearStickyRows();
            return;
        }

        const refreshToken = ++this.refreshToken;
        const isSynced = await this.syncStickyRows(
            candidates,
            syncRow,
            reflowRow,
            refreshToken
        );

        if (!isSynced || refreshToken !== this.refreshToken) {
            return;
        }

        this.positionStickyRows(candidates);
    }

    private positionStickyRows(candidates: StickyCandidate[]): void {
        if (!this.stickyRows.length) {
            return;
        }

        const { tbodyElement, rowsVirtualizer } = this.viewport;
        const scrollTop = tbodyElement.scrollTop;
        let stickyStackHeight = 0;
        let cumulativePushOff = 0;

        this.syncStickyBodyPosition();

        for (let i = 0, iEnd = candidates.length; i < iEnd; ++i) {
            const candidate = candidates[i];
            const stickyRow = this.stickyRows[i];

            if (!stickyRow) {
                continue;
            }

            const stickyHeight = (
                stickyRow.htmlElement.offsetHeight ||
                rowsVirtualizer.defaultRowHeight
            );
            let pushOff = 0;
            const lastDescendantBottom = this.getRowBottom(
                candidate.lastDescendantId,
                candidate.lastDescendantIndex
            );

            if (typeof lastDescendantBottom === 'number') {
                pushOff = Math.min(
                    0,
                    lastDescendantBottom -
                    scrollTop -
                    stickyStackHeight -
                    cumulativePushOff -
                    stickyHeight
                );
            }

            cumulativePushOff += pushOff;
            stickyRow.translateY = stickyStackHeight + cumulativePushOff;
            stickyRow.htmlElement.style.zIndex = String(candidates.length - i);
            stickyRow.htmlElement.style.transform = cumulativePushOff ?
                `translateY(${Math.floor(cumulativePushOff)}px)` :
                '';
            stickyRow.htmlElement.style.visibility = '';

            stickyStackHeight += stickyHeight;
        }
    }

    private async syncStickyRows(
        candidates: StickyCandidate[],
        syncRow: boolean,
        reflowRow: boolean,
        refreshToken: number
    ): Promise<boolean> {
        const currentRowsById = new Map<RowId, TableRow>();
        for (let i = 0, iEnd = this.stickyRows.length; i < iEnd; ++i) {
            const row = this.stickyRows[i];
            if (typeof row.id !== 'undefined') {
                currentRowsById.set(row.id, row);
            }
        }

        const nextStickyRows: TableRow[] = [];

        for (let i = 0, iEnd = candidates.length; i < iEnd; ++i) {
            const candidate = candidates[i];
            let stickyRow = currentRowsById.get(candidate.rowId);

            if (stickyRow) {
                currentRowsById.delete(candidate.rowId);
            }

            if (!stickyRow) {
                stickyRow = new TableRow(this.viewport, candidate.rowIndex);
                await stickyRow.init();

                if (refreshToken !== this.refreshToken) {
                    stickyRow.destroy();
                    return false;
                }

                await stickyRow.render();
            } else if (
                syncRow ||
                stickyRow.index !== candidate.rowIndex
            ) {
                await stickyRow.reuse(candidate.rowIndex);
            }

            if (refreshToken !== this.refreshToken) {
                return false;
            }

            if (reflowRow) {
                stickyRow.reflow();
            }

            stickyRow.htmlElement.classList.add(stickyRowClassName);
            stickyRow.htmlElement.style.position = 'relative';
            stickyRow.htmlElement.style.top = '';
            stickyRow.htmlElement.style.left = '';
            stickyRow.htmlElement.style.right = '';
            nextStickyRows.push(stickyRow);
        }

        currentRowsById.forEach((row): void => row.destroy());

        this.stickyRows = nextStickyRows;
        this.activeRowIds = candidates.map(
            (candidate): RowId => candidate.rowId
        );

        const stickyBodyElement = this.ensureStickyBody();
        for (let i = 0, iEnd = nextStickyRows.length; i < iEnd; ++i) {
            stickyBodyElement.appendChild(nextStickyRows[i].htmlElement);
        }

        this.syncStickyBodyPosition();

        return true;
    }

    private syncStickyBodyPosition(): void {
        const stickyBodyElement = this.ensureStickyBody();
        const { rowsWidth, tbodyElement } = this.viewport;
        const bodyWidth = Math.max(
            rowsWidth || 0,
            tbodyElement.scrollWidth,
            tbodyElement.clientWidth
        );

        stickyBodyElement.style.top = tbodyElement.offsetTop + 'px';
        stickyBodyElement.style.width = bodyWidth + 'px';
        stickyBodyElement.style.height = this.getStickyRowsHeight() + 'px';
        stickyBodyElement.style.transform = tbodyElement.scrollLeft ?
            `translateX(${-tbodyElement.scrollLeft}px)` :
            '';
    }
}


/* *
 *
 *  Default Export
 *
 * */

export default TreeStickyRowController;
