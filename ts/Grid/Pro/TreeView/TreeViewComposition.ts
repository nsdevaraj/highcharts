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
    rowId: RowId;
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
    const cell = table.getCellFromElement(element) as TableCell | undefined;
    if (!cell) {
        return;
    }

    const controller = cell.row.viewport.grid.treeView;
    const options = controller?.getOptions();
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

    return { cell, controller, rowId };
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
    const restoredCell = (
        viewport.treeStickyRows?.find(
            (row): boolean => row.id === context.rowId
        ) ||
        viewport.getRow(context.rowId)
    )
        ?.cells[columnIndex];

    restoredCell?.htmlElement.focus({
        preventScroll: true
    });
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
    const changed = await context.controller.toggleRow(
        context.rowId,
        true,
        originalEvent
    );

    if (changed) {
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
            !toggleButton ||
            !isTreeEventElementWithinRoots(this, toggleButton)
        ) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        const context = getTreeToggleContext(this, toggleButton);
        if (!context) {
            return;
        }

        void toggleTreeRow(context, event);
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
            !toggleButton ||
            !isTreeEventElementWithinRoots(this, toggleButton)
        ) {
            return;
        }

        const context = getTreeToggleContext(this, toggleButton);
        if (!context) {
            return;
        }

        event.preventDefault();
        context.cell.htmlElement.focus();
    };

    const keyDownListener = (event: KeyboardEvent): void => {
        if (
            event.key !== 'Enter' &&
            event.key !== ' ' &&
            event.key !== 'Spacebar'
        ) {
            return;
        }

        const context = getTreeToggleContextFromKeyboardEvent(this, event);
        if (!context) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        void toggleTreeRow(context, event);
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
    delete this.treeStickyRow;
    delete this.treeStickyRows;
}

/**
 * Decorates tree column cells with indentation and toggle control.
 */
function onAfterCellRender(this: TableCell): void {
    const grid = this.row.viewport.grid;
    const controller = grid.treeView;
    const options = controller?.getOptions();
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
}

declare module '../../Core/Table/Table' {
    export default interface Table {
        treeStickyRow?: TableRow;
        treeStickyRows?: TableRow[];
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
