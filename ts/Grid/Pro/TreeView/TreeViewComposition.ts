/* *
 *
 *  Grid Tree View Composition
 *
 *  (c) 2020-2026 Highsoft AS
 *
 *  A commercial license may be required depending on use.
 *  See www.highcharts.com/license
 *
 *  Authors:
 *  - Dawid Dragula
 *
 * */

'use strict';


/* *
 *
 *  Imports
 *
 * */

import type Grid from '../../Core/Grid';
import type { RowId } from '../../Core/Data/DataProvider';
import type Table from '../../Core/Table/Table';
import type { RestoreCellFocusEvent } from '../../Core/Table/Table';
import type TableRow from '../../Core/Table/Body/TableRow';
import type TableCell from '../../Core/Table/Body/TableCell';
import type { TreeViewOptions } from './TreeViewTypes';
import type {
    AfterTreeRowToggleEvent,
    BeforeTreeRowToggleEvent,
    TreeRowToggleTriggerEvent
} from './TreeProjectionController';

import Globals from '../../Core/Globals.js';
import TreeProjectionController from './TreeProjectionController.js';
import TreeStickyRowController from './TreeStickyRowController.js';
import { createGridIcon } from '../../Core/UI/SvgIcons.js';
import { addEvent, pushUnique } from '../../../Shared/Utilities.js';
import { waitForAnimationFrame } from '../../Core/GridUtils.js';


/* *
 *
 *  Composition
 *
 * */

type TreeToggleClickListener = (event: MouseEvent) => void;
type TreeToggleDblClickListener = (event: MouseEvent) => void;
type TreeToggleMouseDownListener = (event: MouseEvent) => void;
type TreeToggleKeyDownListener = (event: KeyboardEvent) => void;
type TreeToggleWheelListener = (event: WheelEvent) => void;
type TreeToggleScrollListener = () => void;
type TreeToggleContext = {
    cell: TableCell;
    controller: TreeProjectionController;
    isExpanded: boolean;
    rowId: RowId;
};
type TreeToggleAnchor = {
    top: number;
};
type TreeToggleListeners = {
    click: TreeToggleClickListener;
    dblClick: TreeToggleDblClickListener;
    mouseDown: TreeToggleMouseDownListener;
    keyDown: TreeToggleKeyDownListener;
    wheel?: TreeToggleWheelListener;
    scroll?: TreeToggleScrollListener;
    stickyBody?: HTMLElement;
};

const treeToggleAttribute = 'data-hcg-tree-toggle';
const treeToggleSelector = '[' + treeToggleAttribute + ']';
const treeToggleListeners = new WeakMap<Table, TreeToggleListeners>();

/**
 * Returns sticky rows rendered by the TreeView overlay.
 *
 * @param table
 * Table viewport handling tree sticky rows.
 */
function getRenderedStickyRows(table: Table): TableRow[] {
    return table.treeStickyRowController?.getRenderedStickyRows() || [];
}

/**
 * Returns a rendered tree row from either the sticky overlay or the viewport
 * body.
 *
 * @param table
 * Table viewport handling tree rows.
 *
 * @param rowId
 * Target row ID.
 */
function getRenderedTreeRow(
    table: Table,
    rowId: RowId
): TableRow | undefined {
    return getRenderedStickyRows(table).find(
        (row): boolean => row.id === rowId
    ) || table.getRow(rowId);
}

/**
 * Returns a rendered sticky cell for the provided row and column index.
 *
 * @param table
 * Table viewport handling tree sticky rows.
 *
 * @param rowIndex
 * Target row index in the projected row order.
 *
 * @param columnIndex
 * Target column index.
 */
function getRenderedStickyCell(
    table: Table,
    rowIndex: number,
    columnIndex: number
): TableCell | undefined {
    const stickyRow = getRenderedStickyRows(table).find(
        (row): boolean => row.index === rowIndex
    );

    return stickyRow?.cells[columnIndex] as TableCell | undefined;
}

/**
 * Returns whether an element belongs to the main body or sticky overlay body.
 *
 * @param table
 * Table viewport handling the event.
 *
 * @param element
 * DOM element from the delegated event.
 */
function isTreeEventElementWithinRoots(
    table: Table,
    element: Element
): boolean {
    return table.tbodyElement.contains(element) || (
        table.treeStickyRowController
            ?.getStickyBodyElement()
            .contains(element) || false
    );
}

/**
 * Resolves a cell from either the main tbody or the sticky overlay body.
 *
 * @param table
 * Table viewport handling the delegated event.
 *
 * @param element
 * Event target that originated within a table cell.
 */
function getTreeCellFromElement(
    table: Table,
    element: EventTarget | null
): TableCell | undefined {
    if (!(element instanceof Element)) {
        return;
    }

    const td = element.closest('td');
    if (!td) {
        return;
    }

    const tr = td.parentElement;
    if (!tr) {
        return;
    }

    const stickyRow = getRenderedStickyRows(table).find(
        (row): boolean => row.htmlElement === tr
    );

    if (stickyRow) {
        const cellIndex = Array.prototype.indexOf.call(tr.children, td);
        return stickyRow.cells[cellIndex] as TableCell | undefined;
    }

    return table.getCellFromElement(element) as TableCell | undefined;
}

/**
 * Focuses a rendered sticky cell when present, otherwise falls back to the
 * generic viewport row focusing logic.
 *
 * @param table
 * Table viewport handling the focus request.
 *
 * @param rowIndex
 * Target row index in the projected row order.
 *
 * @param columnIndex
 * Target column index.
 */
function focusTreeCellByRowIndex(
    table: Table,
    rowIndex: number,
    columnIndex: number
): void {
    if (
        columnIndex < 0 ||
        columnIndex >= table.columns.length
    ) {
        return;
    }

    const stickyCell = getRenderedStickyCell(
        table,
        rowIndex,
        columnIndex
    );

    if (stickyCell) {
        delete table.pendingFocusCursor;
        stickyCell.htmlElement.focus({
            preventScroll: true
        });
        return;
    }

    table.focusCellByRowIndex(rowIndex, columnIndex);
}

/**
 * Handles tree-aware keyboard navigation for body and sticky rows.
 *
 * @param table
 * Table viewport handling the event.
 *
 * @param cell
 * Focused cell.
 *
 * @param event
 * Keyboard event to handle.
 */
function handleTreeBodyNavigation(
    table: Table,
    cell: TableCell,
    event: KeyboardEvent
): boolean {
    const { column, row } = cell;
    const { header } = table;
    const changeFocusKeys: Record<string, [number, number]> = {
        ArrowDown: [1, 0],
        ArrowUp: [-1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1]
    };
    const dir = changeFocusKeys[event.key];

    if (!dir) {
        return false;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const nextColumnIndex = column.index + dir[1];

    if (!dir[0]) {
        row.cells[nextColumnIndex]?.htmlElement.focus({
            preventScroll: true
        });
        return true;
    }

    const nextRowIndex = row.index + dir[0];

    if (nextRowIndex < 0 && header) {
        const extraRowIdx = header.rows.length + nextRowIndex;

        if (extraRowIdx + 1 > header.levels) {
            header.rows[extraRowIdx]
                .cells[nextColumnIndex]?.htmlElement.focus();
        } else {
            table.columns[nextColumnIndex]
                ?.header?.htmlElement.focus();
        }

        return true;
    }

    focusTreeCellByRowIndex(table, nextRowIndex, nextColumnIndex);
    return true;
}

/**
 * Prevents viewport body focus restoration when the target cell is already
 * focused in the sticky overlay.
 *
 * @param event
 * Focus restoration event emitted by the viewport.
 */
function onTableBeforeRestoreCellFocus(
    this: Table,
    event: RestoreCellFocusEvent
): void {
    const stickyCell = getRenderedStickyCell(
        this,
        event.rowIndex,
        event.columnIndex
    );

    if (stickyCell?.htmlElement === document.activeElement) {
        event.preventDefault?.();
    }
}

/**
 * Composes Grid Pro with TreeView projection infrastructure.
 *
 * @param GridClass
 * Grid class to extend.
 *
 * @param TableClass
 * Table class to extend.
 *
 * @param TableCellClass
 * TableCell class to extend.
 */
export function compose(
    GridClass: typeof Grid,
    TableClass: typeof Table,
    TableCellClass: typeof TableCell
): void {
    if (!pushUnique(Globals.composed, 'TreeView')) {
        return;
    }

    addEvent(GridClass, 'beforeLoad', onBeforeLoad);
    addEvent(GridClass, 'afterLoad', onAfterLoad);
    addEvent(GridClass, 'beforeDestroy', onBeforeDestroy);
    addEvent(GridClass, 'afterRedraw', onAfterRedraw);
    addEvent(GridClass, 'beforeTreeRowToggle', onBeforeTreeRowToggle);
    addEvent(GridClass, 'afterTreeRowToggle', onAfterTreeRowToggle);
    addEvent(TableClass, 'beforeInit', onTableBeforeInit);
    addEvent(TableClass, 'afterInit', onTableAfterInit);
    addEvent(TableClass, 'afterReflow', onTableAfterReflow);
    addEvent(
        TableClass,
        'beforeRestoreCellFocus',
        onTableBeforeRestoreCellFocus
    );
    addEvent(TableClass, 'getViewportTopInset', onTableGetViewportTopInset);
    addEvent(TableClass, 'afterDestroy', onTableAfterDestroy);
    addEvent(TableCellClass, 'afterRender', onAfterCellRender);
}

/**
 * Initializes TreeView projection infrastructure before first data querying.
 */
function onBeforeLoad(this: Grid): void {
    if (!this.treeView) {
        this.treeView = new TreeProjectionController(this);
    }
}

/**
 * Schedules sticky parent row refresh after initial render.
 */
function onAfterLoad(this: Grid): void {
    this.viewport?.treeStickyRowController?.scheduleRefresh(false, true);
}

/**
 * Cleans up TreeView projection infrastructure on Grid destroy.
 *
 * @param e
 * Grid destroy event metadata.
 *
 * @param e.onlyDOM
 * Whether destroy is limited to DOM teardown before a re-render.
 */
function onBeforeDestroy(this: Grid, e: { onlyDOM?: boolean }): void {
    if (e.onlyDOM) {
        return;
    }

    this.treeView?.destroy();
    delete this.treeView;
}

/**
 * Runs grid callback before a tree row toggle.
 *
 * @param e
 * Tree row toggle event payload.
 */
function onBeforeTreeRowToggle(
    this: Grid,
    e: BeforeTreeRowToggleEvent
): void {
    this.options?.events?.beforeTreeRowToggle?.call(this, e);
}

/**
 * Runs grid callback after a tree row toggle.
 *
 * @param e
 * Tree row toggle event payload.
 */
function onAfterTreeRowToggle(
    this: Grid,
    e: AfterTreeRowToggleEvent
): void {
    this.options?.events?.afterTreeRowToggle?.call(this, e);
}

/**
 * Schedules sticky parent row refresh after grid redraws.
 */
function onAfterRedraw(this: Grid): void {
    this.viewport?.treeStickyRowController?.scheduleRefresh(true, true);
}

/**
 * Returns tree-toggle context for an element within a tree cell.
 *
 * @param table
 * Table viewport handling the tree cell.
 *
 * @param element
 * Element within the tree cell or toggle button.
 */
function getTreeToggleContext(
    table: Table,
    element: Element
): TreeToggleContext | undefined {
    const cell = getTreeCellFromElement(table, element);
    if (!cell) {
        return;
    }

    const controller = cell.row.viewport.grid.treeView;
    const options = controller?.options;
    const projectionState = controller?.getProjectionState();
    const treeColumn = (
        options?.treeColumn ||
        cell.row.viewport.columns[0]?.id
    );

    if (!controller || !projectionState || !treeColumn) {
        return;
    }

    if (cell.column.id !== treeColumn) {
        return;
    }

    const rowId = cell.row.id ?? projectionState?.rowIds[cell.row.index];
    const rowState = rowId !== void 0 ?
        projectionState.rowsById.get(rowId) :
        void 0;

    if (rowId === void 0 || !rowState?.hasChildren) {
        return;
    }

    return {
        cell,
        controller,
        isExpanded: rowState.isExpanded,
        rowId
    };
}

/**
 * Returns whether the event target is a focusable tree column cell with a
 * toggleable row.
 *
 * @param table
 * Table viewport handling the keydown event.
 *
 * @param event
 * Keyboard event originating from a table cell.
 */
function getTreeToggleContextFromKeyboardEvent(
    table: Table,
    event: KeyboardEvent
): TreeToggleContext | undefined {
    if (!(event.target instanceof HTMLTableCellElement)) {
        return;
    }

    return getTreeToggleContext(table, event.target);
}

/**
 * Restores focus to the tree cell after a redraw caused by toggle.
 *
 * @param context
 * Tree-toggle context captured before the redraw.
 */
function restoreTreeCellFocus(
    context: TreeToggleContext
): void {
    const columnIndex = context.cell.column.index;
    const viewport = context.cell.row.viewport;
    const restoredCell = getRenderedTreeRow(
        viewport,
        context.rowId
    )?.cells[columnIndex];

    if (restoredCell) {
        restoredCell.htmlElement.focus({
            preventScroll: true
        });
        return;
    }

    const rowIndex = context.controller
        .getProjectionState()
        ?.rowIds.indexOf(context.rowId);

    if (typeof rowIndex === 'number' && rowIndex > -1) {
        focusTreeCellByRowIndex(viewport, rowIndex, columnIndex);
    }
}

/**
 * Captures the current visual anchor for a collapsing tree row.
 *
 * @param context
 * Tree-toggle context captured from the current DOM cell.
 */
function captureTreeToggleAnchor(
    context: TreeToggleContext
): TreeToggleAnchor | undefined {
    if (!context.isExpanded) {
        return;
    }

    const rowElement = context.cell.htmlElement.parentElement;

    if (!(rowElement instanceof HTMLTableRowElement)) {
        return;
    }

    return {
        top: rowElement.getBoundingClientRect().top
    };
}

/**
 * Restores the collapsed tree row to its previous visual anchor position.
 *
 * @param context
 * Tree-toggle context captured from the current DOM cell.
 *
 * @param anchor
 * Previously captured anchor position.
 */
async function restoreTreeToggleAnchor(
    context: TreeToggleContext,
    anchor?: TreeToggleAnchor
): Promise<void> {
    if (!anchor) {
        return;
    }

    const viewport = context.cell.row.viewport;
    const renderedRow = getRenderedTreeRow(viewport, context.rowId);

    if (!renderedRow?.htmlElement.isConnected) {
        return;
    }

    const tbody = viewport.tbodyElement;
    const delta = renderedRow.htmlElement.getBoundingClientRect().top -
        anchor.top;

    if (Math.abs(delta) < 1) {
        return;
    }

    const nextScrollTop = Math.max(
        0,
        Math.min(
            tbody.scrollTop + delta,
            Math.max(tbody.scrollHeight - tbody.clientHeight, 0)
        )
    );

    if (nextScrollTop === tbody.scrollTop) {
        return;
    }

    tbody.scrollTop = nextScrollTop;

    if (viewport.virtualRows) {
        viewport.rowsVirtualizer.scroll();
    }

    viewport.treeStickyRowController?.handleScroll();
    await waitForAnimationFrame();
}

/**
 * Converts wheel delta to CSS pixels.
 *
 * @param event
 * Wheel event raised over the sticky overlay.
 *
 * @param viewportSize
 * The relevant viewport size for page-based deltas.
 *
 * @param lineSize
 * Pixel size used for line-based deltas.
 */
function normalizeWheelDelta(
    event: WheelEvent,
    viewportSize: number,
    lineSize: number
): [number, number] {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        return [
            event.deltaX * lineSize,
            event.deltaY * lineSize
        ];
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        return [
            event.deltaX * viewportSize,
            event.deltaY * viewportSize
        ];
    }

    return [event.deltaX, event.deltaY];
}

/**
 * Toggles tree row and restores focus when redraw replaces the DOM cell.
 *
 * @param context
 * Tree-toggle context captured from the current DOM cell.
 *
 * @param originalEvent
 * Browser event that initiated the toggle.
 */
async function toggleTreeRow(
    context: TreeToggleContext,
    originalEvent?: TreeRowToggleTriggerEvent
): Promise<void> {
    const anchor = captureTreeToggleAnchor(context);
    const changed = await context.controller.toggleRow(
        context.rowId,
        true,
        originalEvent
    );

    if (changed) {
        await waitForAnimationFrame();
        await restoreTreeToggleAnchor(context, anchor);
        restoreTreeCellFocus(context);
    }
}

/**
 * Adds delegated listeners for tree toggle buttons and keyboard shortcuts.
 */
function onTableBeforeInit(this: Table): void {
    this.treeStickyRowController = new TreeStickyRowController(this);
    const stickyBody = this.treeStickyRowController.getStickyBodyElement();

    const clickListener = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const toggleButton = event.target.closest(treeToggleSelector);
        if (
            toggleButton &&
            isTreeEventElementWithinRoots(this, toggleButton)
        ) {
            event.preventDefault();
            event.stopImmediatePropagation();

            const context = getTreeToggleContext(this, toggleButton);
            if (!context) {
                return;
            }

            void toggleTreeRow(context, event);
            return;
        }

        if (event.currentTarget === stickyBody) {
            getTreeCellFromElement(this, event.target)?.onClick();
        }
    };

    const dblClickListener = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) {
            return;
        }

        if (event.target.closest(treeToggleSelector)) {
            return;
        }

        const context = getTreeToggleContext(this, event.target);
        if (!context) {
            if (event.currentTarget === stickyBody) {
                const cell = getTreeCellFromElement(this, event.target);
                if (cell && 'onDblClick' in cell) {
                    (
                        cell as unknown as { onDblClick(e: MouseEvent): void }
                    ).onDblClick(event);
                }
            }
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        context.cell.htmlElement.focus();

        void toggleTreeRow(context, event);
    };

    const mouseDownListener = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const toggleButton = event.target.closest(treeToggleSelector);
        if (
            toggleButton &&
            isTreeEventElementWithinRoots(this, toggleButton)
        ) {
            const context = getTreeToggleContext(this, toggleButton);
            if (!context) {
                return;
            }

            event.preventDefault();
            context.cell.htmlElement.focus();
            return;
        }

        if (event.currentTarget === stickyBody) {
            const cell = getTreeCellFromElement(this, event.target);
            if (cell && 'onMouseDown' in cell) {
                (
                    cell as unknown as { onMouseDown(e: MouseEvent): void }
                ).onMouseDown(event);
            }
        }
    };

    const keyDownListener = (event: KeyboardEvent): void => {
        const cell = getTreeCellFromElement(this, event.target);

        if (
            (
                event.key === 'Enter' ||
                event.key === ' ' ||
                event.key === 'Spacebar'
            ) &&
            cell
        ) {
            const context = getTreeToggleContextFromKeyboardEvent(this, event);
            if (context) {
                event.preventDefault();
                event.stopImmediatePropagation();

                void toggleTreeRow(context, event);
                return;
            }
        }

        if (!cell) {
            return;
        }

        if (handleTreeBodyNavigation(this, cell, event)) {
            return;
        }

        if (
            event.currentTarget === stickyBody &&
            event.key === 'Enter'
        ) {
            event.preventDefault();
            event.stopImmediatePropagation();
            cell.onClick();
        }
    };

    const wheelListener = (event: WheelEvent): void => {
        if (event.ctrlKey) {
            return;
        }

        const tbody = this.tbodyElement;
        const [deltaX, deltaY] = normalizeWheelDelta(
            event,
            tbody.clientHeight,
            this.rowsVirtualizer.defaultRowHeight
        );
        const maxScrollTop = Math.max(
            tbody.scrollHeight - tbody.clientHeight,
            0
        );
        const maxScrollLeft = Math.max(
            tbody.scrollWidth - tbody.clientWidth,
            0
        );
        const nextScrollTop = Math.max(
            0,
            Math.min(tbody.scrollTop + deltaY, maxScrollTop)
        );
        const nextScrollLeft = Math.max(
            0,
            Math.min(tbody.scrollLeft + deltaX, maxScrollLeft)
        );

        if (
            nextScrollTop === tbody.scrollTop &&
            nextScrollLeft === tbody.scrollLeft
        ) {
            return;
        }

        event.preventDefault();
        tbody.scrollTop = nextScrollTop;
        tbody.scrollLeft = nextScrollLeft;
    };

    this.tbodyElement.addEventListener('click', clickListener);
    this.tbodyElement.addEventListener('dblclick', dblClickListener);
    this.tbodyElement.addEventListener('mousedown', mouseDownListener);
    this.tbodyElement.addEventListener('keydown', keyDownListener);
    stickyBody.addEventListener('click', clickListener);
    stickyBody.addEventListener('dblclick', dblClickListener);
    stickyBody.addEventListener('mousedown', mouseDownListener);
    stickyBody.addEventListener('keydown', keyDownListener);
    stickyBody.addEventListener('wheel', wheelListener, {
        passive: false
    });
    treeToggleListeners.set(this, {
        click: clickListener,
        dblClick: dblClickListener,
        mouseDown: mouseDownListener,
        keyDown: keyDownListener,
        wheel: wheelListener,
        stickyBody
    });
}

/**
 * Adds scroll listener for sticky parent row positioning after the table is
 * fully initialized.
 */
function onTableAfterInit(this: Table): void {
    const listeners = treeToggleListeners.get(this);
    if (!listeners) {
        return;
    }

    const scrollListener = (): void => {
        this.treeStickyRowController?.handleScroll();
    };

    this.tbodyElement.addEventListener('scroll', scrollListener);
    listeners.scroll = scrollListener;

    this.treeStickyRowController?.scheduleRefresh(false, true);
}

/**
 * Repositions sticky parent rows after table reflow.
 */
function onTableAfterReflow(this: Table): void {
    this.treeStickyRowController?.scheduleRefresh(false, true);
}

/**
 * Extends the visible viewport inset by the current sticky tree stack height.
 *
 * @param e
 * Event payload with the current top inset.
 *
 * @param e.top
 * Current top inset reserved by composed table features.
 */
function onTableGetViewportTopInset(
    this: Table,
    e: { top: number }
): void {
    e.top = Math.max(
        e.top,
        this.treeStickyRowController?.getStickyRowsHeight() || 0
    );
}

/**
 * Removes the delegated click listener for tree toggle buttons.
 */
function onTableAfterDestroy(this: Table): void {
    const listeners = treeToggleListeners.get(this);
    if (!listeners) {
        return;
    }

    this.tbodyElement.removeEventListener('click', listeners.click);
    this.tbodyElement.removeEventListener('dblclick', listeners.dblClick);
    this.tbodyElement.removeEventListener('mousedown', listeners.mouseDown);
    this.tbodyElement.removeEventListener('keydown', listeners.keyDown);
    listeners.stickyBody?.removeEventListener('click', listeners.click);
    listeners.stickyBody?.removeEventListener('dblclick', listeners.dblClick);
    listeners.stickyBody?.removeEventListener(
        'mousedown',
        listeners.mouseDown
    );
    listeners.stickyBody?.removeEventListener('keydown', listeners.keyDown);
    if (listeners.wheel) {
        listeners.stickyBody?.removeEventListener('wheel', listeners.wheel);
    }
    if (listeners.scroll) {
        this.tbodyElement.removeEventListener('scroll', listeners.scroll);
    }
    treeToggleListeners.delete(this);

    this.treeStickyRowController?.destroy();
    delete this.treeStickyRowController;
}

/**
 * Decorates tree column cells with indentation and toggle control.
 */
function onAfterCellRender(this: TableCell): void {
    const grid = this.row.viewport.grid;
    const controller = grid.treeView;
    const options = controller?.options;
    const projectionState = controller?.getProjectionState();

    if (!options || !projectionState) {
        return;
    }

    const treeColumn = (
        options.treeColumn ||
        this.row.viewport.columns[0]?.id
    );

    if (!treeColumn || this.column.id !== treeColumn) {
        return;
    }

    const rendererType = this.column.options.cells?.renderer?.type;
    if (rendererType && rendererType !== 'text') {
        return;
    }

    const rowId = (
        this.row.id ??
        projectionState.rowIds[this.row.index]
    );
    if (rowId === void 0) {
        return;
    }

    const rowState = projectionState.rowsById.get(rowId);
    if (!rowState) {
        return;
    }

    const cellElement = this.htmlElement;
    const wrapper = document.createElement('div');
    wrapper.className = Globals.classNamePrefix + 'tree-cell-wrapper';
    wrapper.style.setProperty(
        '--hcg-tree-depth',
        String(rowState.depth)
    );

    const toggleContainer = document.createElement('span');
    toggleContainer.className = (
        Globals.classNamePrefix + 'tree-toggle-container'
    );

    if (rowState.hasChildren) {
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = (
            Globals.getClassName('button') +
            ' ' +
            Globals.classNamePrefix +
            'tree-toggle-button'
        );
        toggleButton.setAttribute(
            'aria-label',
            rowState.isExpanded ? 'Collapse row' : 'Expand row'
        );
        toggleButton.setAttribute(
            'aria-expanded',
            rowState.isExpanded ? 'true' : 'false'
        );
        toggleButton.setAttribute('tabindex', '-1');
        toggleButton.setAttribute(treeToggleAttribute, '');

        const toggleIcon = createGridIcon(
            'chevronRight',
            grid.options?.rendering?.icons
        );
        toggleIcon.classList.add(
            Globals.classNamePrefix + 'tree-toggle-icon'
        );
        toggleIcon.setAttribute('aria-hidden', 'true');
        toggleButton.appendChild(toggleIcon);

        toggleContainer.appendChild(toggleButton);
    }

    const valueContainer = document.createElement('span');
    valueContainer.className = Globals.classNamePrefix + 'tree-value-container';

    while (cellElement.firstChild) {
        valueContainer.appendChild(cellElement.firstChild);
    }

    wrapper.appendChild(toggleContainer);
    wrapper.appendChild(valueContainer);
    cellElement.appendChild(wrapper);
}


/* *
 *
 *  Declarations
 *
 * */

declare module '../../Core/Grid' {
    export default interface Grid {
        treeView?: TreeProjectionController;
    }

    interface RowMetaRecord {
        /**
         * Explicit expansion state override for the row.
         */
        expanded?: boolean;
    }
}

declare module '../../Core/Table/Table' {
    export default interface Table {
        treeStickyRowController?: TreeStickyRowController;
    }
}

declare module '../GridEvents' {
    interface GridEvents {
        /**
         * Callback function to be called before a tree row is toggled.
         *
         * Call `event.preventDefault()` to cancel the toggle.
         */
        beforeTreeRowToggle?: (e: BeforeTreeRowToggleEvent) => void;

        /**
         * Callback function to be called after a tree row is toggled.
         */
        afterTreeRowToggle?: (e: AfterTreeRowToggleEvent) => void;
    }
}

declare module '../../Core/Data/LocalDataProvider' {
    interface LocalDataProviderOptions {
        /**
         * Tree view options for local provider (Grid Pro module).
         */
        treeView?: TreeViewOptions;
    }
}


/* *
 *
 *  Default export
 *
 * */

export default {
    compose
} as const;
