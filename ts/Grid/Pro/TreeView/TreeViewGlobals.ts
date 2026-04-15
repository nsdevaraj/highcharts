/* *
 *
 *  Grid Tree View globals
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

import Globals from '../../Core/Globals.js';


/* *
 *
 *  Constants
 *
 * */

export const classNames = {
    cellWrapper: Globals.classNamePrefix + 'tree-cell-wrapper',
    toggleContainer: Globals.classNamePrefix + 'tree-toggle-container',
    toggleButton: Globals.classNamePrefix + 'tree-toggle-button',
    toggleIcon: Globals.classNamePrefix + 'tree-toggle-icon',
    valueContainer: Globals.classNamePrefix + 'tree-value-container'
} as const;

export const cssVariables = {
    depth: '--hcg-tree-depth'
} as const;


/* *
 *
 *  Default Export
 *
 * */

export default {
    classNames,
    cssVariables
} as const;
