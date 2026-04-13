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
const maxStickyRows = 10;


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

    /**
     * The viewport table instance that owns the sticky rows.
     */
    private readonly viewport: Table;

    /**
     * Row IDs currently rendered as sticky rows.
     */
    private activeRowIds: RowId[] = [];

    /**
     * Pending animation frame used to batch sticky row refreshes.
     */
    private animationFrameId?: number;

    /**
     * Whether sticky rows need reflow during the next refresh.
     */
    private needsRowReflow = false;

    /**
     * Whether sticky rows need synchronization during the next refresh.
     */
    private needsRowSync = false;

    /**
     * Refresh token used to discard stale async work.
     */
    private refreshToken = 0;

    /**
     * Currently rendered sticky row instances.
     */
    private stickyRows: TableRow[] = [];

    /**
     * Detached table body used to host sticky rows.
     */
    private stickyBodyElement?: HTMLTableSectionElement;

    /**
     * Whether the controller applied positioning to the table element.
     */
    private ownsTablePosition = false;


    /* *
     *
     *  Constructor
     *
     * */

    /**
     * Constructs the sticky row controller.
     *
     * @param viewport
     * The viewport table instance.
     */
    constructor(viewport: Table) {
        this.viewport = viewport;
    }


    /* *
     *
     *  Methods
     *
     * */

    /**
     * Returns whether sticky parent rows are enabled.
     */
    public get enabled(): boolean {
        return !!this.viewport.grid.treeView?.options?.stickyParents;
    }

    /**
     * Destroys sticky rows and pending controller state.
     */
    public destroy(): void {
        if (typeof this.animationFrameId === 'number') {
            cancelAnimationFrame(this.animationFrameId);
            delete this.animationFrameId;
        }

        this.clearStickyRows();
        this.destroyStickyBody();
    }

    /**
     * Returns the first rendered sticky row.
     */
    public getRenderedStickyRow(): TableRow | undefined {
        if (!this.enabled) {
            return;
        }

        return this.stickyRows[0];
    }

    /**
     * Returns the rendered sticky row instances.
     */
    public getRenderedStickyRows(): TableRow[] {
        if (!this.enabled) {
            return [];
        }

        return this.stickyRows;
    }

    /**
     * Returns the total height of the rendered sticky rows.
     */
    public getStickyRowsHeight(): number {
        if (!this.enabled) {
            return 0;
        }

        return this.stickyRows.reduce(
            (height, row): number =>
                height + (
                    row.htmlElement.offsetHeight ||
                    this.viewport.rowsVirtualizer.defaultRowHeight
                ),
            0
        );
    }

    /**
     * Returns the sticky body container element.
     */
    public getStickyBodyElement(): HTMLTableSectionElement {
        return this.ensureStickyBody();
    }

    /**
     * Updates sticky rows in response to viewport scrolling.
     */
    public handleScroll(): void {
        if (!this.enabled) {
            this.clearStickyRows();
            return;
        }

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

    /**
     * Schedules sticky row refresh on the next animation frame.
     *
     * @param syncRow
     * Whether sticky rows should be synchronized with source rows.
     *
     * @param reflowRow
     * Whether sticky rows should be reflowed after synchronization.
     */
    public scheduleRefresh(
        syncRow: boolean = false,
        reflowRow: boolean = false
    ): void {
        if (!this.enabled) {
            if (typeof this.animationFrameId === 'number') {
                cancelAnimationFrame(this.animationFrameId);
                delete this.animationFrameId;
            }

            this.needsRowSync = false;
            this.needsRowReflow = false;
            this.clearStickyRows();

            return;
        }

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

    /**
     * Checks whether current sticky rows match the candidate row IDs.
     *
     * @param candidates
     * Sticky row candidates to compare with the current rendered state.
     */
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

    /**
     * Clears and destroys all rendered sticky rows.
     */
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

    /**
     * Destroys the sticky body container and restores table positioning.
     */
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

    /**
     * Ensures the sticky body container exists and is attached.
     */
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

    /**
     * Finds the first rendered row intersecting the given scroll position.
     *
     * @param visibleTop
     * Scroll position within the viewport body.
     */
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

    /**
     * Returns the rendered or estimated height for a row.
     *
     * @param rowId
     * ID of the row to measure.
     */
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

    /**
     * Returns the height used for a sticky row candidate.
     *
     * @param candidate
     * Sticky row candidate to measure.
     */
    private getCandidateRowHeight(candidate: StickyCandidate): number {
        return this.getRowHeight(candidate.rowId) ||
            this.viewport.rowsVirtualizer.defaultRowHeight;
    }

    /**
     * Returns the rendered or estimated top position for a candidate row.
     *
     * @param candidate
     * Sticky row candidate to position.
     */
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

    /**
     * Returns sticky row candidates for the current viewport state.
     */
    private getCurrentCandidates(): StickyCandidate[] {
        const projectionState = this.viewport.grid.treeView
            ?.getProjectionState();

        if (
            !this.enabled ||
            !projectionState ||
            !this.viewport.tbodyElement.isConnected ||
            this.viewport.tbodyElement.clientHeight <= 0
        ) {
            return [];
        }

        return this.getStackCandidates(projectionState);
    }

    /**
     * Builds the current sticky row stack from the projection state.
     *
     * @param projectionState
     * Current projection metadata for visible tree rows.
     */
    private getStackCandidates(
        projectionState: TreeProjectionState
    ): StickyCandidate[] {
        const activeCandidates: StickyCandidate[] = [];
        let slotTop = this.viewport.tbodyElement.scrollTop;

        for (let i = 0; i < maxStickyRows; ++i) {
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

    /**
     * Returns the projected row index for a row ID.
     *
     * @param rowId
     * ID of the row to resolve.
     *
     * @param projectionState
     * Current projection metadata for visible tree rows.
     *
     * @param topVisibleRow
     * Currently resolved top visible row in the viewport.
     */
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

    /**
     * Returns the rendered top position of a viewport row.
     *
     * @param row
     * Rendered viewport row to position.
     */
    private getRowTop(row: TableRow): number {
        if (this.viewport.virtualRows) {
            return row.translateY;
        }

        return row.htmlElement.offsetTop;
    }

    /**
     * Returns the rendered viewport row for a row ID.
     *
     * @param rowId
     * ID of the row to resolve.
     */
    private getRenderedViewportRow(rowId: RowId): TableRow | undefined {
        return this.viewport.rows.find((row): boolean => row.id === rowId);
    }

    /**
     * Returns the rendered or estimated bottom position of a row.
     *
     * @param rowId
     * ID of the row to position.
     *
     * @param rowIndex
     * Projected row index used for virtual estimation.
     *
     * @param rowHeight
     * Optional row height hint used for virtual estimation.
     */
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

    /**
     * Checks whether the left candidates match the right candidate prefix.
     *
     * @param left
     * Currently active sticky row candidates.
     *
     * @param right
     * Candidate chain resolved for the current top row.
     */
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

    /**
     * Returns the expanded ancestor chain eligible for sticky rendering.
     *
     * @param topVisibleRow
     * Currently resolved top visible row in the viewport.
     *
     * @param projectionState
     * Current projection metadata for visible tree rows.
     */
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

            if (
                rowState.hasChildren &&
                rowState.isExpanded
            ) {
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

    /**
     * Refreshes sticky rows using the current viewport state.
     */
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

    /**
     * Positions rendered sticky rows within the sticky body.
     *
     * @param candidates
     * Sticky row candidates to position.
     */
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

    /**
     * Synchronizes rendered sticky rows with the current candidates.
     *
     * @param candidates
     * Sticky row candidates to synchronize.
     *
     * @param syncRow
     * Whether sticky rows should be synchronized with source rows.
     *
     * @param reflowRow
     * Whether sticky rows should be reflowed after synchronization.
     *
     * @param refreshToken
     * Refresh token used to discard stale async work.
     */
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

    /**
     * Synchronizes sticky body position and dimensions with the viewport.
     */
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
