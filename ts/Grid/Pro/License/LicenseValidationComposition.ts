/* *
 *
 *  License Validation Composition for Grid Pro
 *
 *  (c) 2020-2025 Highsoft AS
 *
 *  License: www.highcharts.com/license
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
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

import LicenseValidation from './LicenseValidation.js';
import LicenseState from './LicenseState.js';
import Globals from '../../../Core/Globals.js';
import { addEvent, pushUnique } from '../../../Shared/Utilities.js';


/* *
 *
 *  Functions
 *
 * */

/**
 * Compose license validation into Grid Pro.
 *
 * @param GridClass
 * The Grid class to extend with license validation.
 *
 * @internal
 */
function compose(GridClass: typeof Grid): void {
    // Ensure composition only applied once
    if (!pushUnique(Globals.composed, 'LicenseValidation')) {
        return;
    }

    // Hook into Grid after viewport render (earliest event Grid fires)
    addEvent(GridClass, 'afterRenderViewport', onGridInit);
}

/**
 * Check license on Grid initialization.
 *
 * @internal
 */
function onGridInit(this: Grid): void {
    // Skip validation in SSR environments
    if (typeof window === 'undefined') {
        return;
    }

    // Skip validation on whitelisted URLs
    // (localhost, *.highcharts.com, *.jsfiddle.net, *.stackblitz.com,
    // *.highcharts.com.cn)
    if (LicenseValidation.isWhitelistedURL()) {
        return;
    }

    // Get Grid key from instance
    let gridKey = this.options?.gridKey;

    // Auto-promote instance key to global if different from current global
    // (Allows later grids to override stale/invalid keys)
    if (gridKey && gridKey !== LicenseState.key) {
        LicenseState.key = gridKey;
    }

    // Use global key if instance doesn't have one
    if (!gridKey) {
        gridKey = LicenseState.key;
    }

    // Skip validation if we've already validated this exact key
    const lastKey = LicenseState.lastValidatedKey;
    if (lastKey !== void 0 && gridKey === lastKey) {
        return;
    }

    // Validate the Grid Key
    const isValid = LicenseValidation.validate(gridKey);

    // Track the validated key to avoid redundant validation
    LicenseState.lastValidatedKey = gridKey;

    // Show warning only once if invalid or missing
    const hasWarned = LicenseState.warningShown;
    if (!isValid && !hasWarned) {
        // eslint-disable-next-line no-console
        console.warn(
            'This is an unlicensed version of Highcharts Grid Pro. ' +
            'Insert a Grid Key in the configuration or visit ' +
            'https://shop.highcharts.com to get one.'
        );
        LicenseState.warningShown = true;
    }
}


/* *
 *
 *  Declarations
 *
 * */

declare module '../../Core/Options' {
    interface Options {
        /**
         * Grid Key for Grid Pro. Get your Grid Key at:
         * https://shop.highcharts.com
         *
         * The Grid Key can be set globally using `Grid.setOptions()` or
         * on individual Grid instances. One Grid Key works for all
         * Grid instances on a page.
         *
         * @example
         * // Global setting (recommended)
         * Grid.setOptions({ gridKey: 'ABCD-EFGH-IJKL-MN0P' });
         *
         * @example
         * // Per instance (auto-promotes to global)
         * Grid.grid('container', {
         *   gridKey: 'ABCD-EFGH-IJKL-MN0P',
         *   dataTable: {...}
         * });
         */
        gridKey?: string;
    }
}


/* *
 *
 *  Default Export
 *
 * */

const LicenseValidationComposition = {
    compose
};

export default LicenseValidationComposition;
