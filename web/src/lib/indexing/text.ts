const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 250;

export function toPlainText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPlainText(item)).filter(Boolean).join("\n");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.text === "string") {
      return record.text;
    }

    const keys = Object.keys(record).filter((key) => key !== "type" && key !== "attrs");
    return keys
      .map((key) => toPlainText(record[key]))
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

export function chunkText(input: string, size = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_CHUNK_OVERLAP) {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) {
    return [] as string[];
  }

  if (size <= overlap) {
    throw new Error("Chunk size must be greater than overlap");
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const targetEnd = Math.min(cursor + size, normalized.length);
    const windowText = normalized.slice(cursor, targetEnd);

    const paragraphBreak = windowText.lastIndexOf("\n\n");
    const sentenceBreak = Math.max(windowText.lastIndexOf(". "), windowText.lastIndexOf("? "), windowText.lastIndexOf("! "));
    const softBreak = Math.max(paragraphBreak, sentenceBreak);

    const end = softBreak > size * 0.6 ? cursor + softBreak + 1 : targetEnd;
    const chunk = normalized.slice(cursor, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks;
}
