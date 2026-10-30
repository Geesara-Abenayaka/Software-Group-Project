import 'dotenv/config';
import process from 'node:process';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Program from './models/Program.js';
import { UPDATES, NEW_PROGRAMS, PROPOSED_PROGRAMS } from './data/csePrograms.js';

// Never drops data. Updates only the listed fields and inserts programmes that don't exist yet.
const dryRun = process.argv.includes('--dry-run');
const withProposed = process.argv.includes('--with-proposed');
const label = dryRun ? '[dry run] ' : '';

const run = async () => {
  await connectDB();
  console.log(`${label}database: ${mongoose.connection.host}/${mongoose.connection.name}`);

  for (const [shortCode, fields] of Object.entries(UPDATES)) {
    const existing = await Program.findOne({ shortCode }).lean();
    if (!existing) {
      console.log(`skip    ${shortCode}: not in database`);
      continue;
    }

    for (const key of Object.keys(fields)) {
      console.log(`${label}update  ${shortCode}.${key}: ${JSON.stringify(existing[key])} -> ${JSON.stringify(fields[key])}`);
    }

    if (!dryRun) {
      await Program.updateOne({ shortCode }, { $set: { ...fields, updatedAt: new Date() } }, { runValidators: true });
    }
  }

  const toInsert = withProposed ? [...NEW_PROGRAMS, ...PROPOSED_PROGRAMS] : NEW_PROGRAMS;

  for (const program of toInsert) {
    if (await Program.exists({ shortCode: program.shortCode })) {
      console.log(`skip    ${program.shortCode}: already exists`);
      continue;
    }

    console.log(`${label}insert  ${program.shortCode} (${program.title})`);

    if (!dryRun) {
      await Program.create({ ...program, resourcesCount: program.resources.length });
    }
  }

  await mongoose.disconnect();
  console.log(dryRun ? 'Dry run finished. Nothing was written.' : 'Done.');
};

run().catch(async (error) => {
  console.error('Upsert failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
