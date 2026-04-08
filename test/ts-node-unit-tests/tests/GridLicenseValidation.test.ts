import { describe, it } from 'node:test';
import { strictEqual } from 'node:assert';

import LicenseValidation from '../../../ts/Grid/Pro/License/LicenseValidation.js';

describe('Grid Pro license validation', () => {
    it('accepts keys with matching base-36 checksum', () => {
        const data = 'ABCDEFGHIJKL';
        const checksum = LicenseValidation.calculateChecksum(data);
        const key = `${data.slice(0, 4)}-${data.slice(4, 8)}-${
            data.slice(8, 12)
        }-${checksum}`;

        strictEqual(LicenseValidation.validate(key), true);
    });

    it('rejects non-alphanumeric key segments even if checksum matches', () => {
        strictEqual(
            LicenseValidation.validate('!!!!-$$$$-%%%%-026C'),
            false
        );
    });
});
