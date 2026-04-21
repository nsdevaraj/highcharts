/* *
 *
 *  A commercial license may be required depending on use.
 *  See www.highcharts.com/license
 *
 *
 * */

/* *
 *
 *  Imports
 *
 * */

import type {
    SMAOptions,
    SMAParamsOptions
} from '../SMA/SMAOptions';

/* *
 *
 *  Declarations
 *
 * */

/**
 * Options for the CCI indicator.
 *
 * @interface Highcharts.CCIOptions
 * @extends Highcharts.SMAOptions
 */
export interface CCIOptions extends SMAOptions {
    /**
     * Parameters used in calculation of CCI values.
     */
    params?: CCIParamsOptions;
}

/**
 * Parameters used in calculation of CCI values.
 *
 * @interface Highcharts.CCIParamsOptions
 * @extends Highcharts.SMAParamsOptions
 */
export interface CCIParamsOptions extends SMAParamsOptions {
    // For inheritance
}

/* *
 *
 *  Default Export
 *
 * */

export default CCIOptions;
