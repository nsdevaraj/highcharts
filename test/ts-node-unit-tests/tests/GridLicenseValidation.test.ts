import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';

import LicenseValidation, {
    LicenseStatus
} from '../../../ts/Grid/Pro/License/LicenseValidation.js';

const REF = new Date(Date.UTC(2026, 3, 13));

const KEY_ANNUAL_VALID = 'V9HR-6DCZ-TB80-A21V-06UJ-0000';
const KEY_ANNUAL_EXPIRED = 'AJU0-DG0S-1ZX1-A1HL-0726-0000';
const KEY_PERPETUAL_SUPPORT_ENDED = 'LC4W-4MDA-95VZ-P1MO-07FY-0000';

describe('Grid Pro license validation', () => {
    it('Valid key', () => {
        strictEqual(
            LicenseValidation.getStatus(KEY_ANNUAL_VALID, REF),
            LicenseStatus.VALID
        );
    });

    it('Annual expired key', () => {
        strictEqual(
            LicenseValidation.getStatus(KEY_ANNUAL_EXPIRED, REF),
            LicenseStatus.EXPIRED
        );
    });

    it('Perpetual license past support end', () => {
        strictEqual(
            LicenseValidation.getStatus(KEY_PERPETUAL_SUPPORT_ENDED, REF),
            LicenseStatus.EXPIRED
        );
    });

    it('Missing key', () => {
        strictEqual(
            LicenseValidation.getStatus(void 0, REF),
            LicenseStatus.MISSING
        );
    });

    it('Invalid key (malformed)', () => {
        strictEqual(
            LicenseValidation.getStatus('not-a-grid-key', REF),
            LicenseStatus.INVALID
        );
    });
});
