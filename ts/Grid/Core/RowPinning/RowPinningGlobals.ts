/* *
 *
 *  Grid Row Pinning globals
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

import Globals from '../../Core/Globals.js';

/* *
 *
 *  Constants
 *
 * */

/**
 * The class names used by the row pinning functionality.
 */
export const classNames = {
    scrollableTbodyElement: Globals.classNamePrefix + 'tbody-scrollable',
    pinnedTopTbodyElement: Globals.classNamePrefix + 'tbody-pinned-top',
    pinnedBottomTbodyElement: Globals.classNamePrefix + 'tbody-pinned-bottom',
    pinnedTbodyElementActive: Globals.classNamePrefix + 'tbody-pinned-active',
    rowPinned: Globals.classNamePrefix + 'row-pinned',
    rowPinnedTop: Globals.classNamePrefix + 'row-pinned-top',
    rowPinnedBottom: Globals.classNamePrefix + 'row-pinned-bottom'
} as const;
