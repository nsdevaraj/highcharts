import { afterEach, beforeEach, describe, it } from 'node:test';
import { strictEqual } from 'node:assert';

import LicenseValidation, {
    LicenseStatus
} from '../../../ts/Grid/Pro/License/LicenseValidation.js';

/**
 * Fixed calendar day (UTC) for `t.mock.timers` so `new Date()` and the
 * `getGridBuildDate` placeholder path are stable.
 */
const STATIC_DAY = new Date(Date.UTC(2026, 3, 13));
const KEY_ANNUAL_VALID = 'NMD7-4JNR-GU9L-A223-06PP-0000';
const KEY_ANNUAL_EXPIRED = 'C2TR-Z9ZC-OL4D-A1HT-07CF-0000';
const KEY_PERPETUAL_SUPPORT_ENDED = '5DR9-W35I-TMXI-P1MW-07PU-0000';

describe('Grid Pro license validation', () => {
    afterEach((c) => {
        if ('mock' in c) {
            c.mock.timers.reset();
        }
    });

    describe('Annual', () => {
        beforeEach((t) => {
            if ('mock' in t) {
                t.mock.timers.enable({ apis: ['Date'], now: STATIC_DAY });
            }
        });

        it('valid', () => {
            strictEqual(
                LicenseValidation.getStatus(KEY_ANNUAL_VALID),
                LicenseStatus.VALID
            );
        });

        it('expired', () => {
            strictEqual(
                LicenseValidation.getStatus(KEY_ANNUAL_EXPIRED),
                LicenseStatus.EXPIRED
            );
        });
    });

    describe('Perpetual', () => {
        it('valid (build before support end in key)', (t) => {
            if ('mock' in t) {
                t.mock.timers.enable({
                    apis: ['Date'],
                    now: new Date(Date.UTC(2000, 0, 1))
                });
            }
            strictEqual(
                LicenseValidation.getStatus(KEY_PERPETUAL_SUPPORT_ENDED),
                LicenseStatus.VALID
            );
        });

        it('expired (build after support end in key)', (t) => {
            if ('mock' in t) {
                t.mock.timers.enable({ apis: ['Date'], now: STATIC_DAY });
            }
            strictEqual(
                LicenseValidation.getStatus(KEY_PERPETUAL_SUPPORT_ENDED),
                LicenseStatus.EXPIRED
            );
        });
    });

    describe('Invalid / missing', () => {
        it('missing', () => {
            strictEqual(
                LicenseValidation.getStatus(void 0),
                LicenseStatus.MISSING
            );
        });

        it('invalid (malformed)', () => {
            strictEqual(
                LicenseValidation.getStatus('not-a-grid-key'),
                LicenseStatus.INVALID
            );
        });
    });
});
