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
import type TableCell from '../../Core/Table/Body/TableCell';
import type { TreeViewOptions } from './TreeViewTypes';

import Globals from '../../Core/Globals.js';
import TreeProjectionController from './TreeProjectionController.js';
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
};

const treeToggleAttribute = 'data-hcg-tree-toggle';
const treeToggleSelector = '[' + treeToggleAttribute + ']';
const treeToggleListeners = new WeakMap<Table, TreeToggleListeners>();

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
    addEvent(GridClass, 'beforeDestroy', onBeforeDestroy);
    addEvent(TableClass, 'beforeInit', onTableBeforeInit);
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
    const restoredCell = context.cell.row.viewport
        .getRow(context.rowId)
        ?.cells[columnIndex];

    restoredCell?.htmlElement.focus({
        preventScroll: true
    });
}

/**
 * Toggles tree row and restores focus when redraw replaces the DOM cell.
 *
 * @param context
 * Tree-toggle context captured from the current DOM cell.
 */
async function toggleTreeRow(
    context: TreeToggleContext
): Promise<void> {
    const changed = await context.controller.toggleRow(context.rowId);

    if (changed) {
        restoreTreeCellFocus(context);
    }
}

/**
 * Adds delegated listeners for tree toggle buttons and keyboard shortcuts.
 */
function onTableBeforeInit(this: Table): void {
    const clickListener = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const toggleButton = event.target.closest(treeToggleSelector);
        if (!toggleButton || !this.tbodyElement.contains(toggleButton)) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        const context = getTreeToggleContext(this, toggleButton);
        if (!context) {
            return;
        }

        void toggleTreeRow(context);
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

        void toggleTreeRow(context);
    };

    const mouseDownListener = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const toggleButton = event.target.closest(treeToggleSelector);
        if (!toggleButton || !this.tbodyElement.contains(toggleButton)) {
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

        void toggleTreeRow(context);
    };

    this.tbodyElement.addEventListener('click', clickListener);
    this.tbodyElement.addEventListener('dblclick', dblClickListener);
    this.tbodyElement.addEventListener('mousedown', mouseDownListener);
    this.tbodyElement.addEventListener('keydown', keyDownListener);
    treeToggleListeners.set(this, {
        click: clickListener,
        dblClick: dblClickListener,
        mouseDown: mouseDownListener,
        keyDown: keyDownListener
    });
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
    treeToggleListeners.delete(this);
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
