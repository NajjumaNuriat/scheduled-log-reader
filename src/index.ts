// src/index.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readBatch } from "./reader";

// Configuration
const LOG = "logs.log";
const OFFSET = "offset.json";
const BATCH = 10;
const SCHEDULE = "*/1 * * * *"; // Every 5 seconds

// State
let run = 1;

// 1. Read the offset
function getOffset(): number {
  if (!existsSync(OFFSET)) return 0;
  try {
    const data = JSON.parse(readFileSync(OFFSET, "utf-8"));
    return data.offset || 0;
  } catch {
    return 0;
  }
}

// 2. Save the offset
function saveOffset(offset: number) {
  writeFileSync(OFFSET, JSON.stringify({ offset }, null, 2));
}

// 3. The main logic
async function processBatch() {
  const timestamp = new Date().toISOString();
  const currentOffset = getOffset();
  
  // We pass `true` to flushPartial so if the file doesn't end with a newline, we still get the last line.
  const batch = await readBatch(LOG, currentOffset, BATCH, true);

  if (batch.lines.length === 0) {
    console.log(`\n[${timestamp}] Run ${run}: No new lines.`);
  } else {
    console.log(`\n[${timestamp}] Run ${run}:`);
    batch.lines.forEach((line) => console.log(`  ${line}`));
    saveOffset(batch.offset);
  }

  // Requirement 6: Stop if we've reached the end of the file
  // If the new offset equals the file size, we're done.
  if (batch.offset >= batch.size) {
    console.log(`\n✅ Reached end of file. Stopping.`);
    job.stop();
    process.exit(0);
  }
  
  run++;
}

// 4. Main Execution
if (!existsSync(LOG)) {
  console.error(`Fatal: ${LOG} not found.`);
  process.exit(1);
}

console.log(`Starting Incremental Log Reader.`);
const job = Bun.cron(SCHEDULE, processBatch);
