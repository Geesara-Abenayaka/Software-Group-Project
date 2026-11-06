import mongoose from 'mongoose';
import Application from '../models/Application.js';
import { toReference } from './reportRules.js';

// Finds bank receipts uploaded with more than one application: one bank payment can only pay one fee.
// Uploads saved since November 2026 carry a SHA-256 of the file (gridfsService.js), so the same file is
// found exactly. Older uploads have none; for them the same original file name and size is reported as
// "possibly the same file".

const nameAndSize = (file) => {
  const name = String(file?.metadata?.originalFileName || file?.filename || '').trim().toLowerCase();
  return name && file?.length ? `${name}:${file.length}` : '';
};

/**
 * receipts: [{ applicationId, reference, fullName, file: { length, filename, metadata: { sha256?, originalFileName? } } }]
 * Returns a Map: applicationId -> [{ applicationId, reference, fullName, exact }] (only applications with a match).
 */
export const findReceiptMatches = (receipts) => {
  const bySha = new Map();
  const byNameAndSize = new Map();
  const add = (map, key, receipt) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(receipt);
  };

  receipts.forEach((receipt) => {
    add(bySha, receipt.file?.metadata?.sha256 || '', receipt);
    add(byNameAndSize, nameAndSize(receipt.file), receipt);
  });

  const matches = new Map();
  receipts.forEach((receipt) => {
    const sha = receipt.file?.metadata?.sha256 || '';
    const found = new Map();

    (sha ? bySha.get(sha) : []).forEach((other) => {
      if (other.applicationId !== receipt.applicationId) found.set(other.applicationId, { other, exact: true });
    });

    (byNameAndSize.get(nameAndSize(receipt.file)) || []).forEach((other) => {
      const otherSha = other.file?.metadata?.sha256 || '';
      // Two fingerprinted files with different hashes are different files, whatever their names.
      if (other.applicationId === receipt.applicationId || found.has(other.applicationId) || (sha && otherSha)) return;
      found.set(other.applicationId, { other, exact: false });
    });

    if (found.size > 0) {
      matches.set(receipt.applicationId, [...found.values()].map(({ other, exact }) => ({
        applicationId: other.applicationId,
        reference: other.reference,
        fullName: other.fullName,
        exact
      })));
    }
  });

  return matches;
};

// Loads every uploaded bank receipt (all periods, so a receipt reused months later is still found).
export const loadReceiptMatches = async () => {
  const applications = await Application.find({ 'documents.paymentConfirmation': { $exists: true, $ne: null } })
    .select('fullName documents.paymentConfirmation')
    .lean();
  if (applications.length < 2) return new Map();

  const files = await mongoose.connection.db.collection('uploads.files')
    .find(
      { _id: { $in: applications.map((application) => application.documents.paymentConfirmation) } },
      { projection: { length: 1, filename: 1, 'metadata.sha256': 1, 'metadata.originalFileName': 1 } }
    )
    .toArray();
  const filesById = new Map(files.map((file) => [String(file._id), file]));

  return findReceiptMatches(applications.map((application) => ({
    applicationId: String(application._id),
    reference: toReference(application._id),
    fullName: application.fullName || '',
    file: filesById.get(String(application.documents.paymentConfirmation)) || null
  })));
};
