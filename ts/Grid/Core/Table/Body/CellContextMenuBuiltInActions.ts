/* *
 *
 *  Grid Cell Context Menu built-in actions
 *
 *  (c) 2020-2026 Highsoft AS
 *
 *  A commercial license may be required depending on use.
 *  See www.highcharts.com/license
 *
 *  Authors:
 *  - Mikkel Espolin Birkeland
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */

import type TableCell from './TableCell';
import type {
    CellContextMenuActionId,
    CellContextMenuActionItemOptions,
    CellContextMenuBuiltInItemOptions,
    CellContextMenuDividerItemOptions,
    CellContextMenuItemOptions
} from '../../Options';
import type { GridIconName } from '../../UI/SvgIcons';

import {
    hasConfiguredGridRowPinningOptions,
    getGridRowPinningOptions
} from '../../RowPinning/RowPinningController.js';
import {
    isArray,
    isNumber,
    isObject,
    isString
} from '../../../../Shared/Utilities.js';

/* *
 *
 *  Constants
 *
 * */

const warnedUnknownActionIds = new Set<string>();

export const defaultBuiltInCellContextMenuActions: CellContextMenuActionId[] = [
    'pinRowTop',
    'pinRowBottom',
    'unpinRow'
];

const builtInActionDefinitions: Record<
    CellContextMenuActionId,
    BuiltInActionDefinition
> = {
    pinRowTop: {
        getLabel: (cell: TableCell): string =>
            cell.row.viewport.grid.options?.lang?.pinRowTop || 'Pin row to top',
        icon: 'pin',
        isDisabled: (cell, rowId): boolean =>
            isPinnedStateDisabled('pinRowTop', cell, rowId),
        onClick: (cell, rowId): void => {
            void cell.row.viewport.grid.pinRow(rowId, 'top');
        }
    },
    pinRowBottom: {
        getLabel: (cell: TableCell): string =>
            cell.row.viewport.grid.options?.lang?.pinRowBottom ||
            'Pin row to bottom',
        icon: 'pin',
        isDisabled: (cell, rowId): boolean =>
            isPinnedStateDisabled('pinRowBottom', cell, rowId),
        onClick: (cell, rowId): void => {
            void cell.row.viewport.grid.pinRow(rowId, 'bottom');
        }
    },
    unpinRow: {
        getLabel: (cell: TableCell): string =>
            cell.row.viewport.grid.options?.lang?.unpinRow || 'Unpin row',
        icon: 'unpin',
        isDisabled: (cell, rowId): boolean =>
            isPinnedStateDisabled('unpinRow', cell, rowId),
        onClick: (cell, rowId): void => {
            void cell.row.viewport.grid.unpinRow(rowId);
        }
    }
};

export interface ResolvedCellContextMenuActionItemOptions {
    label: string;
    icon?: string;
    disabled?: boolean;
    onClick?: (
        this: TableCell,
        cell: TableCell
    ) => void;
    items?: ResolvedCellContextMenuItemOptions[];
}

export type ResolvedCellContextMenuItemOptions =
    CellContextMenuDividerItemOptions |
    ResolvedCellContextMenuActionItemOptions;

interface BuiltInActionDefinition {
    getLabel: (cell: TableCell) => string;
    icon: GridIconName;
    isDisabled: (
        cell: TableCell,
        rowId: string|number|undefined
    ) => boolean;
    onClick: (cell: TableCell, rowId: string|number) => void;
}

/* *
 *
 *  Functions
 *
 * */

/**
 * Checks whether a context menu item is a divider item.
 *
 * @param item
 * Context menu item declaration.
 *
 * @return
 * True when the item is a divider.
 */
function isDivider(
    item: CellContextMenuItemOptions
): item is CellContextMenuDividerItemOptions {
    return (
        typeof item === 'object' &&
        !!item &&
        'separator' in item &&
        item.separator === true
    );
}

/**
 * Checks whether an item is a built-in override declaration.
 *
 * @param item
 * Context menu item declaration.
 *
 * @return
 * True when the item is a built-in override.
 */
function isBuiltInOverride(
    item: CellContextMenuItemOptions
): item is CellContextMenuBuiltInItemOptions {
    return (
        typeof item === 'object' &&
        !!item &&
        'actionId' in item
    );
}

/**
 * Checks whether an item contains nested submenu items.
 *
 * @param item
 * Context menu item declaration.
 *
 * @return
 * True when submenu items are provided.
 */
function hasNestedItems(
    item: CellContextMenuItemOptions
): item is (
    CellContextMenuActionItemOptions |
    CellContextMenuBuiltInItemOptions
) & {
    items: CellContextMenuItemOptions[];
} {
    return (
        isObject(item, true) &&
        'items' in item &&
        isArray(item.items)
    );
}

/**
 * Logs unknown built-in action ids once per id.
 *
 * @param actionId
 * Unknown action id.
 */
function warnUnknownBuiltInAction(actionId: string): void {
    if (warnedUnknownActionIds.has(actionId)) {
        return;
    }
    warnedUnknownActionIds.add(actionId);

    // eslint-disable-next-line no-console
    console.warn(
        `Grid cell context menu: Unknown built-in actionId "${actionId}".`
    );
}

/**
 * Returns the current row id if available.
 *
 * @param cell
 * Table cell for the context menu.
 *
 * @return
 * Row id when available.
 */
function getCurrentRowId(cell: TableCell): (string|number|undefined) {
    const rowId = cell.row.id;
    if (isString(rowId) || isNumber(rowId)) {
        return rowId;
    }
}

/**
 * Returns whether row pinning option is enabled.
 *
 * @param cell
 * Table cell for the context menu.
 *
 * @return
 * True when row pinning option is enabled.
 */
function isPinningOptionEnabled(cell: TableCell): boolean {
    const grid = cell.row.viewport.grid;
    if (hasConfiguredGridRowPinningOptions(grid)) {
        return getGridRowPinningOptions(grid)?.enabled !== false;
    }

    return !!grid.rowPinning?.isEnabled();
}

/**
 * Returns whether the context menu should be enabled for a cell.
 *
 * @param cell
 * Table cell for the context menu.
 *
 * @return
 * True when the context menu is effectively enabled.
 */
function isContextMenuEnabled(cell: TableCell): boolean {
    const options = cell.column?.options.cells?.contextMenu;

    if (options?.enabled === false) {
        return false;
    }

    if (options?.enabled === true) {
        return true;
    }

    if (options?.items !== void 0) {
        return true;
    }

    return isPinningOptionEnabled(cell);
}

/**
 * Returns the built-in action definition for a given action ID.
 *
 * @param actionId
 * Built-in action id.
 *
 * @return
 * Built-in action definition when known.
 */
function getBuiltInActionDefinition(
    actionId: string
): BuiltInActionDefinition | undefined {
    if (actionId in builtInActionDefinitions) {
        return builtInActionDefinitions[actionId as CellContextMenuActionId];
    }

    warnUnknownBuiltInAction(actionId);
}

/**
 * Returns disabled state for a built-in action based on row pinning state.
 *
 * @param actionId
 * Built-in action id.
 *
 * @param cell
 * Table cell for the context menu.
 *
 * @param rowId
 * Current row id.
 *
 * @return
 * True when the action should be disabled.
 */
function isPinnedStateDisabled(
    actionId: CellContextMenuActionId,
    cell: TableCell,
    rowId: string|number|undefined
): boolean {
    if (rowId === void 0 || !isPinningOptionEnabled(cell)) {
        return true;
    }

    const pinned = cell.row.viewport.grid.getPinnedRows?.() || {
        topIds: [],
        bottomIds: []
    };
    const inTop = pinned.topIds.includes(rowId);
    const inBottom = pinned.bottomIds.includes(rowId);

    if (actionId === 'pinRowTop') {
        return inTop;
    }
    if (actionId === 'pinRowBottom') {
        return inBottom;
    }

    return !inTop && !inBottom;
}

/**
 * Resolves one built-in action declaration into a regular action item.
 *
 * @param actionId
 * Built-in action id.
 *
 * @param cell
 * Table cell for the context menu.
 *
 * @param override
 * Optional label/icon/disabled overrides.
 *
 * @param isBranch
 * Whether this item should be treated as a branch item.
 *
 * @return
 * Resolved action item or undefined for unknown action ids.
 */
function resolveBuiltInAction(
    actionId: string,
    cell: TableCell,
    override?: CellContextMenuBuiltInItemOptions,
    isBranch?: boolean
): (ResolvedCellContextMenuActionItemOptions|undefined) {
    const definition = getBuiltInActionDefinition(actionId);
    if (!definition) {
        return;
    }

    const rowId = getCurrentRowId(cell);
    const disabled = isBranch ?
        !!override?.disabled :
        definition.isDisabled(cell, rowId) || !!override?.disabled;

    return {
        label: override?.label || definition.getLabel(cell),
        icon: override?.icon || definition.icon,
        disabled,
        onClick: isBranch ?
            void 0 :
            (): void => {
                if (rowId === void 0) {
                    return;
                }

                definition.onClick(cell, rowId);
            }
    };
}

/**
 * Resolves raw item declarations recursively.
 *
 * @param cell
 * Table cell for the context menu.
 *
 * @param rawItems
 * Source item declarations.
 *
 * @param useDefaults
 * Whether omitted items should resolve to top-level defaults.
 *
 * @return
 * Resolved context menu items.
 */
function resolveCellContextMenuItemsAtLevel(
    cell: TableCell,
    rawItems: CellContextMenuItemOptions[] | undefined,
    useDefaults: boolean
): ResolvedCellContextMenuItemOptions[] {
    const sourceItems = rawItems === void 0 ?
        (useDefaults ? defaultBuiltInCellContextMenuActions : []) :
        rawItems;

    if (!sourceItems.length) {
        return [];
    }

    const resolved: ResolvedCellContextMenuItemOptions[] = [];

    for (const rawItem of sourceItems) {
        if (isDivider(rawItem)) {
            resolved.push(rawItem);
            continue;
        }

        const isBranchCandidate = hasNestedItems(rawItem);
        const childItems = isBranchCandidate ?
            resolveCellContextMenuItemsAtLevel(cell, rawItem.items, false) :
            [];
        const isBranch = childItems.length > 0;

        if (typeof rawItem === 'string') {
            const builtInItem = resolveBuiltInAction(rawItem, cell);
            if (builtInItem) {
                resolved.push(builtInItem);
            }
            continue;
        }

        if (isBuiltInOverride(rawItem)) {
            const builtInItem = resolveBuiltInAction(
                rawItem.actionId,
                cell,
                rawItem,
                isBranch
            );
            if (builtInItem) {
                if (isBranch) {
                    builtInItem.items = childItems;
                }
                resolved.push(builtInItem);
            }
            continue;
        }

        const customItem: ResolvedCellContextMenuActionItemOptions = {
            label: rawItem.label,
            icon: rawItem.icon,
            disabled: rawItem.disabled,
            onClick: isBranch ? void 0 : rawItem.onClick,
            items: isBranch ? childItems : void 0
        };

        resolved.push(customItem);
    }

    return resolved;
}

/**
 * Resolves context menu items, including built-in action declarations.
 *
 * @param cell
 * Table cell for the context menu.
 *
 * @return
 * Resolved context menu items.
 */
export function resolveCellContextMenuItems(
    cell: TableCell
): ResolvedCellContextMenuItemOptions[] {
    if (!isContextMenuEnabled(cell)) {
        return [];
    }

    const options = cell.column?.options.cells?.contextMenu;
    return resolveCellContextMenuItemsAtLevel(cell, options?.items, true);
}

/* *
 *
 *  Default export
 *
 * */

/**
 * Built-in cell context menu action helpers.
 */
export default {
    defaultBuiltInCellContextMenuActions,
    resolveCellContextMenuItems
} as const;
