/* *
 *
 *  License Validation for Grid Pro
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
 * */

'use strict';


/* *
 *
 *  Imports
 *
 * */

import type Grid from '../../Core/Grid';
import Globals from '../../../Core/Globals.js';
import {
    defined,
    isNumber,
    isString
} from '../../../Shared/Utilities.js';


/* *
 *
 *  Constants
 *
 * */

const GRID_KEY_PART = /^[A-Z0-9]{4}$/;
const GRID_KEY_EPOCH = Date.UTC(2020, 0, 1);
const GRID_KEY_DOC = 'https://www.highcharts.com/docs/grid/grid-key';

/** Hostnames (exact or `*.domain`) where a Grid Key is not required. */
const GRID_KEY_WILDCARD_DOMAINS = [
    'localhost',
    'highcharts.com',
    'jsfiddle.net',
    'stackblitz.com',
    'highcharts.com.cn'
] as const;


/* *
 *
 *  Declarations
 *
 * */

/**
 * Result of status for a Grid Key string.
 * @internal
 */
export enum LicenseStatus {
    VALID = 'valid',
    INVALID = 'invalid',
    MISSING = 'missing',
    EXPIRED = 'expired'
}


/* *
 *
 *  Class
 *
 * */

/**
 * The class that handles Grid Pro license keys: validation on load and update,
 * parsing, and status checks for the grid.
 */
class LicenseValidation {

    /* *
     *
     *  Properties
     *
     * */

    /**
     * Flag for validation of license key.
     * @internal
     */
    private static hasValidatedLicenseKey = false;

    /* *
     *
     *  Methods
     *
     * */

    /**
     * Segment 5 checksum: weighted char sum of payload, mod `36^4`, 4-char
     * upper base-36.
     * @internal
     *
     * @param integrityPayload16 segments 1–4 joined, no hyphens (16 chars).
     */
    public static calculateChecksum(integrityPayload16: string): string {
        let sum = 0;
        for (let i = 0; i < integrityPayload16.length; i++) {
            sum += integrityPayload16.charCodeAt(i) * (i + 1);
        }
        const mod = sum % 1679616;
        let checksum = mod.toString(36).toUpperCase();

        while (checksum.length < 4) {
            checksum = '0' + checksum;
        }

        return checksum;
    }

    /**
     * Parse a Grid Key (`XXXX-…-WWWW`, six hyphen-separated groups of four
     * `A–Z`/`0–9`).
     * @internal
     *
     * @param key raw key.
     *
     * @returns expiry segment, end date, and checksum matches.
     */
    private static parseKey(
        key: string
    ): {
        expirySegment: string;
        endDate: Date;
        checksumMatches: boolean;
    } | null {

        // 1. Normalize (trim spaces, upper case).
        const normalizedKey = key.replace(/\s/g, '').toUpperCase();
        const segments = normalizedKey.split('-');
        const expirySegment = segments[3] ?? '';
        let daysSinceEpoch = 0;
        let invalidSegment4Digits = false;

        // 2. Convert base-36 digits to days since epoch.
        for (let i = 1; i < 4; i++) {
            const codeUnit = expirySegment.charCodeAt(i);
            const digit =
                codeUnit <= 57 ? codeUnit - 48 : 10 + (codeUnit - 65);
            if (digit < 0 || digit > 35) {
                invalidSegment4Digits = true;
                break;
            }
            daysSinceEpoch = daysSinceEpoch * 36 + digit;
        }

        // 3. Calculate license expiry date.
        const endDate = new Date(GRID_KEY_EPOCH + daysSinceEpoch * 864e5);

        // 4. Checksum of joined segments 1–4.
        const integrityPayload = segments.slice(0, 4).join('');
        const expectedSegment5 = this.calculateChecksum(integrityPayload);
        const checksumMatches = segments[4] === expectedSegment5;

        if (
            !normalizedKey.length ||
            segments.length !== 6 ||
            !segments.every((part): boolean => GRID_KEY_PART.test(part)) ||
            !/^[AP]/.test(expirySegment) ||
            invalidSegment4Digits ||
            !isNumber(endDate.getTime())
        ) {
            return null;
        }

        return {
            expirySegment,
            endDate,
            checksumMatches
        };
    }

    /**
     * License status from key shape, checksum, and expiry vs UTC day of `now`.
     * @internal
     *
     * @param key Grid Key (optional).
     * @param now Expiry reference; default today (UTC day).
     *
     * @returns Status enum value for `key` at `now`.
     */
    public static getStatus(
        key?: string,
        now: Date = new Date()
    ): LicenseStatus {

        // Check if the key is a string and not empty.
        if (!isString(key)) {
            return LicenseStatus.MISSING;
        }

        const x = this.parseKey(key);

        // Check if the key is valid and the checksum matches.
        if (!x || !x.checksumMatches) {
            return LicenseStatus.INVALID;
        }

        // Check if the key is expired.
        if (this.isExpired(x.endDate, now)) {
            return LicenseStatus.EXPIRED;
        }

        // Valid key.
        return LicenseStatus.VALID;
    }

    /**
     * True when `now` (UTC date) is strictly after `end` (UTC date).
     * @internal
     *
     * @param end Parsed license end date.
     * @param now Defaults to `new Date()`.
     */
    public static isExpired(end: Date, now: Date = new Date()): boolean {
        const y = now.getUTCFullYear(),
            m = now.getUTCMonth(),
            d = now.getUTCDate(),
            ey = end.getUTCFullYear(),
            em = end.getUTCMonth(),
            ed = end.getUTCDate();

        return (
            y > ey ||
            (y === ey && m > em) ||
            (y === ey && m === em && d > ed)
        );
    }

    /**
     * Checks if domain is whitelisted (including subdomains).
     * @internal
     */
    public static isWhitelistedURL(): boolean {
        const { win } = Globals;
        if (!defined(win.location)) {
            return false;
        }
        const host = win.location.hostname.toLowerCase();

        // Support subdomains
        return GRID_KEY_WILDCARD_DOMAINS.some(
            (domain): boolean => host === domain || host.endsWith('.' + domain)
        );
    }

    /**
     * Checks key and errors once if not valid.
     * @internal
     *
     * @param grid Grid instance
     */
    public static validate(grid: Grid): void {
        const userOptions = grid.userOptions;
        const options = grid.options;
        const userGridKey = defined(userOptions?.gridKey) ?
            userOptions.gridKey : void 0;
        const optionsGridKey = defined(options?.gridKey) ?
            options.gridKey : void 0;

        if (
            this.isWhitelistedURL() ||
            (
                this.hasValidatedLicenseKey &&
                userGridKey === optionsGridKey
            )
        ) {
            return;
        }

        const status = this.getStatus(optionsGridKey);

        this.hasValidatedLicenseKey = true;

        if (status === LicenseStatus.VALID) {
            return;
        }

        let statusMsg: string;

        switch (status) {
            case LicenseStatus.MISSING:
                statusMsg = 'missing a valid Grid Key.';
                break;
            case LicenseStatus.EXPIRED:
                statusMsg = 'using an expired Grid Key.';
                break;
            default:
                statusMsg = 'using an invalid Grid Key.';
                break;
        }
        const message = (
            'Highcharts Grid Pro is ' + statusMsg + ' ' +
            'Please visit ' + GRID_KEY_DOC + ' for more details.'
        );

        // eslint-disable-next-line no-console
        console.warn(message);
    }
}


/* *
 *
 *  Default Export
 *
 * */

export default LicenseValidation;
