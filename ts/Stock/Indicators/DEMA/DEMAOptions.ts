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
    EMAOptions,
    EMAParamsOptions
} from '../EMA/EMAOptions';

/* *
 *
 *  Declarations
 *
 * */

/**
 * Options for the DEMA indicator.
 *
 * @interface Highcharts.DEMAOptions
 * @extends Highcharts.EMAOptions
 */
export interface DEMAOptions extends EMAOptions {
    /**
     * Parameters used in calculation of the DEMA values.
     */
    params?: DEMAParamsOptions;
}

/**
 * Parameters used in calculation of the DEMA values.
 *
 * @interface Highcharts.DEMAParamsOptions
 * @extends Highcharts.EMAParamsOptions
 */
export interface DEMAParamsOptions extends EMAParamsOptions {
    // For inheritance
}

/* *
 *
 *  Default Export
 *
 * */

export default DEMAOptions;
