// Run with: cd server && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findReceiptMatches } from '../utils/receiptMatches.js';

const receipt = (applicationId, file) => ({ applicationId, reference: `APP-${applicationId}`, fullName: `Applicant ${applicationId}`, file });

test('the same fingerprint is the same file, whatever the name', () => {
  const matches = findReceiptMatches([
    receipt('A', { length: 100, filename: 'receipt.jpg', metadata: { sha256: 'abc' } }),
    receipt('B', { length: 100, filename: 'scan.jpg', metadata: { sha256: 'abc' } }),
    receipt('C', { length: 100, filename: 'other.jpg', metadata: { sha256: 'def' } })
  ]);

  assert.deepEqual(matches.get('A'), [{ applicationId: 'B', reference: 'APP-B', fullName: 'Applicant B', exact: true }]);
  assert.deepEqual(matches.get('B').map((match) => match.applicationId), ['A']);
  assert.equal(matches.has('C'), false);
});

test('older uploads with the same name and size are possibly the same file', () => {
  const matches = findReceiptMatches([
    receipt('A', { length: 2048, filename: 'Receipt.PDF', metadata: { originalFileName: 'Receipt.PDF' } }),
    receipt('B', { length: 2048, filename: 'receipt.pdf', metadata: {} }),
    receipt('C', { length: 4096, filename: 'receipt.pdf', metadata: {} })
  ]);

  assert.deepEqual(matches.get('A'), [{ applicationId: 'B', reference: 'APP-B', fullName: 'Applicant B', exact: false }]);
  assert.equal(matches.has('C'), false, 'different size');
});

test('two fingerprinted files with different hashes are different, even with the same name and size', () => {
  const matches = findReceiptMatches([
    receipt('A', { length: 100, filename: 'receipt.jpg', metadata: { sha256: 'abc' } }),
    receipt('B', { length: 100, filename: 'receipt.jpg', metadata: { sha256: 'xyz' } })
  ]);
  assert.equal(matches.size, 0);
});

test('a fingerprinted file and an older one with the same name and size: possibly the same', () => {
  const matches = findReceiptMatches([
    receipt('A', { length: 100, filename: 'receipt.jpg', metadata: { sha256: 'abc' } }),
    receipt('B', { length: 100, filename: 'receipt.jpg', metadata: {} })
  ]);
  assert.equal(matches.get('A')[0].exact, false);
  assert.equal(matches.get('B')[0].exact, false);
});

test('a missing file (deleted from storage) matches nothing', () => {
  const matches = findReceiptMatches([receipt('A', null), receipt('B', null)]);
  assert.equal(matches.size, 0);
});
