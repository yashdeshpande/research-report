/**
 * dev-preflight.ts
 *
 * Runs before `next dev` to verify that Qdrant and Ollama are reachable and
 * that the required models are available in Ollama (pulling them if not).
 * Exits with a non-zero code and a clear message on any failure so the dev
 * server never starts in a broken state.
 */

const QDRANT_URL = process.env.QDRANT_URL ?? "http://127.0.0.1:6333";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3.1";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
const VECTOR_STORE = (process.env.VECTOR_STORE ?? "sqlite").toLowerCase();

async function checkQdrant(): Promise<void> {
  console.log(`[preflight] Checking Qdrant at ${QDRANT_URL} …`);
  try {
    const res = await fetch(`${QDRANT_URL}/healthz`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    console.log("[preflight] Qdrant is reachable.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[preflight] ERROR: Cannot reach Qdrant at ${QDRANT_URL} (${message}).`);
    console.error("[preflight] Start Qdrant with:  docker run -p 6333:6333 qdrant/qdrant");
    process.exit(1);
  }
}

async function pullOllamaModel(model: string): Promise<void> {
  console.log(`[preflight] Pulling Ollama model "${model}" …`);
  const res = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: model, stream: false }),
    // Pulling can take a while; no request timeout here.
  });
  if (!res.ok) {
    throw new Error(`Pull request failed with HTTP ${res.status}`);
  }
  console.log(`[preflight] Model "${model}" is ready.`);
}

async function checkOllama(): Promise<void> {
  console.log(`[preflight] Checking Ollama at ${OLLAMA_BASE_URL} …`);

  let installedModels: string[] = [];

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    installedModels = (data.models ?? []).map((m) => m.name);
    console.log("[preflight] Ollama is reachable.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[preflight] ERROR: Cannot reach Ollama at ${OLLAMA_BASE_URL} (${message}).`);
    console.error("[preflight] Install and start Ollama from https://ollama.com");
    process.exit(1);
  }

  const requiredModels = [OLLAMA_CHAT_MODEL, OLLAMA_EMBED_MODEL];

  for (const model of requiredModels) {
    const isInstalled = installedModels.some(
      (name) => name === model || name.startsWith(`${model}:`),
    );

    if (isInstalled) {
      console.log(`[preflight] Model "${model}" already available.`);
      continue;
    }

    try {
      await pullOllamaModel(model);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n[preflight] ERROR: Failed to pull Ollama model "${model}": ${message}`);
      process.exit(1);
    }
  }
}

async function main(): Promise<void> {
  console.log("[preflight] Starting dev environment checks …\n");

  if (VECTOR_STORE === "qdrant") {
    await checkQdrant();
  }

  await checkOllama();

  console.log("\n[preflight] All checks passed. Starting Next.js dev server …\n");
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[preflight] Unexpected error: ${message}`);
  process.exit(1);
});
