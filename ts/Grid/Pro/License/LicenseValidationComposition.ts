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
 *  - Sebastian Bochan
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
import Globals from '../../Core/Globals.js';
import { addEvent, pushUnique } from '../../../Shared/Utilities.js';


/* *
 *
 *  Functions
 *
 * */

/**
 * License check handler.
 * @param this Grid instance.
 * @internal
 */
function validateLicense(this: Grid): void {
    LicenseValidation.checkLicense(this);
}

/**
 * Extends the grid classes with license validation.
 *
 * @param GridClass
 * The class to extend.
 *
 */
function compose(GridClass: typeof Grid): void {

    if (!pushUnique(Globals.composed, 'LicenseValidation')) {
        return;
    }

    addEvent(GridClass, 'afterLoad', validateLicense);
    addEvent(GridClass, 'afterUpdate', validateLicense);
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
         * Global setting (recommended)
         * 
         * Grid.setOptions({
         *   gridKey: 'XXXX-XXXX-XXXX-AYYY-ZZZZ-WWWW'
         * });
         *
         * @example
         * Per instance (auto-promotes to global)
         *
         * Grid.grid('container', {
         *   gridKey: 'XXXX-XXXX-XXXX-AYYY-ZZZZ-WWWW'
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
