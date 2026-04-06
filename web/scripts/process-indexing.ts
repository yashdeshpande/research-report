import { processIndexingBatch } from "@/lib/indexing/jobs";

async function main() {
  const limit = Number(process.env.INDEXING_BATCH_SIZE ?? "5");
  const results = await processIndexingBatch(Number.isFinite(limit) ? limit : 5);

  if (results.length === 0) {
    console.log("No indexing jobs available.");
    return;
  }

  for (const result of results) {
    if (result.status === "INDEXED") {
      console.log(`Indexed job ${result.id}`);
      continue;
    }

    console.log(`Failed job ${result.id}: ${result.error ?? "Unknown error"}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Indexing processor failed: ${message}`);
  process.exit(1);
});
