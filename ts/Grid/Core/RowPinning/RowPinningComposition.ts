/* *
 *
 *  Grid Row Pinning composition
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
import type { DeepPartial } from '../../../Shared/Types';
import type Options from '../../Core/Options';
import type { RowObject as DataTableRowObject } from '../../../Data/DataTable';
import type { GridEvent } from '../../Core/GridUtils';
import type { RowId } from '../Data/DataProvider';

import { defaultOptions as gridDefaultOptions } from '../../Core/Defaults.js';
import Globals from '../../Core/Globals.js';
import RowPinningController from './RowPinningController.js';
import {
    addEvent,
    merge,
    pushUnique
} from '../../../Shared/Utilities.js';

/**
 * Default options for row pinning.
 */
export const defaultOptions: DeepPartial<Options> = {
    rendering: {
        rows: {
            pinning: {
                enabled: true,
                topIds: [],
                bottomIds: [],
                events: {},
                top: {},
                bottom: {}
            }
        }
    }
};

/* *
 *
 *  Composition
 *
 * */

/**
 * Compose row pinning APIs into Grid.
 *
 * @param GridClass
 * Grid class constructor.
 */
export function compose(
    GridClass: typeof Grid
): void {
    if (!pushUnique(Globals.composed, 'RowPinning')) {
        return;
    }

    merge(true, gridDefaultOptions, defaultOptions);

    addEvent(GridClass, 'beforeLoad', initRowPinning);
}

/**
 * Initialize row pinning controller before grid options are loaded.
 */
function initRowPinning(this: Grid): void {
    this.rowPinning = new RowPinningController(this);
    this.rowPinning.loadOptions();
}

/* *
 *
 *  Declarations
 *
 * */

export type RowPinningPosition = 'top'|'bottom';
export type GridRowId = RowId;
export type RowPinningChangeAction = 'pin'|'unpin'|'toggle';

export interface RowPinningChangeEvent {
    rowId: GridRowId;
    action: RowPinningChangeAction;
    position?: RowPinningPosition;
    index?: number;
    changed: boolean;
    previousTopIds: GridRowId[];
    previousBottomIds: GridRowId[];
    topIds: GridRowId[];
    bottomIds: GridRowId[];
}

export type RowPinningChangeEventCallback = (
    this: Grid,
    e: GridEvent<Grid> & RowPinningChangeEvent
) => void;

export interface RowPinningEvents {
    /**
     * Callback function to be called before runtime row pinning state changes
     * are redrawn (Grid Pro).
     */
    beforeRowPin?: RowPinningChangeEventCallback;

    /**
     * Callback function to be called after runtime row pinning state changes
     * are redrawn (Grid Pro).
     */
    afterRowPin?: RowPinningChangeEventCallback;
}

declare module '../../Core/Options' {
    interface LangOptions {
        /**
         * `Pin row to top` translation.
         *
         * @default 'Pin row to top'
         */
        pinRowTop?: string;

        /**
         * `Pin row to bottom` translation.
         *
         * @default 'Pin row to bottom'
         */
        pinRowBottom?: string;

        /**
         * `Unpin row` translation.
         *
         * @default 'Unpin row'
         */
        unpinRow?: string;
    }

    interface RowsSettings {
        /**
         * Row pinning options.
         */
        pinning?: RowPinningOptions;
    }
}

export interface RowPinningOptions {
    /**
     * Enable/disable row pinning behavior.
     */
    enabled?: boolean;

    /**
     * Column used as stable row identity for row pinning.
     */
    idColumn?: string;
    topIds?: GridRowId[];
    bottomIds?: GridRowId[];
    top?: RowPinningSectionOptions;
    bottom?: RowPinningSectionOptions;
    events?: RowPinningEvents;
    resolve?: (row: DataTableRowObject) => ('top'|'bottom'|null|undefined);
}

export interface RowPinningSectionOptions {
    /**
     * Maximum height for this pinned tbody. Enables vertical scrolling in the
     * pinned section when content exceeds this height.
     */
    maxHeight?: number|string;
}

/* *
 *
 *  Default Export
 *
 * */

export default {
    compose
} as const;
