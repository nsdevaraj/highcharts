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
import type Table from '../../Core/Table/Table';
import type TableCell from '../../Core/Table/Body/TableCell';
import type { TreeViewOptions } from './TreeViewTypes';

import Globals from '../../Core/Globals.js';
import TreeProjectionController from './TreeProjectionController.js';
import { addEvent, pushUnique } from '../../../Shared/Utilities.js';


/* *
 *
 *  Composition
 *
 * */

type TreeToggleClickListener = (event: MouseEvent) => void;

const treeToggleAttribute = 'data-hcg-tree-toggle';
const treeToggleSelector = '[' + treeToggleAttribute + ']';
const treeToggleListeners = new WeakMap<Table, TreeToggleClickListener>();

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
 * Adds a delegated click listener for tree toggle buttons.
 */
function onTableBeforeInit(this: Table): void {
    const listener = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const toggleButton = event.target.closest(treeToggleSelector);
        if (!toggleButton || !this.tbodyElement.contains(toggleButton)) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        const cell = this.getCellFromElement(
            toggleButton
        ) as TableCell | undefined;
        if (!cell) {
            return;
        }

        const controller = cell.row.viewport.grid.treeView;
        const projectionState = controller?.getProjectionState();
        const rowId = cell.row.id ?? projectionState?.rowIds[cell.row.index];

        if (rowId === void 0) {
            return;
        }

        void controller?.toggleRow(rowId);
    };

    this.tbodyElement.addEventListener('click', listener);
    treeToggleListeners.set(this, listener);
}

/**
 * Removes the delegated click listener for tree toggle buttons.
 */
function onTableAfterDestroy(this: Table): void {
    const listener = treeToggleListeners.get(this);
    if (!listener) {
        return;
    }

    this.tbodyElement.removeEventListener('click', listener);
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

    const toggleContainer = document.createElement('span');
    toggleContainer.className = (
        Globals.classNamePrefix + 'tree-toggle-container'
    );
    toggleContainer.style.setProperty(
        '--hcg-tree-depth',
        String(rowState.depth)
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
        toggleButton.textContent = rowState.isExpanded ? '▾' : '▸';
        toggleButton.setAttribute(
            'aria-label',
            rowState.isExpanded ? 'Collapse row' : 'Expand row'
        );
        toggleButton.setAttribute(
            'aria-expanded',
            rowState.isExpanded ? 'true' : 'false'
        );
        toggleButton.setAttribute(treeToggleAttribute, '');

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
