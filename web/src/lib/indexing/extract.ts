import { readFile } from "fs/promises";
import path from "path";

import JSZip from "jszip";
import mammoth from "mammoth";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api.js";
import * as XLSX from "xlsx";

// Point pdfjs-dist at the real worker file so Node.js can spawn it via worker_threads.
// path.resolve() uses process.cwd() (the project root) which is correct in Next.js.
GlobalWorkerOptions.workerSrc = path.resolve(
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
);

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item): item is TextItem => "str" in item)
      .map((item) => item.str)
      .join(" ")
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  return pages.join("\n\n");
}

function stripXml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractFromPptx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const slides: string[] = [];

  for (const fileName of slideFiles) {
    const file = zip.file(fileName);
    if (!file) {
      continue;
    }

    const xml = await file.async("string");
    const fragments = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)).map((match) => stripXml(match[1] ?? ""));
    const text = fragments.filter(Boolean).join("\n").trim();

    if (text) {
      slides.push(text);
    }
  }

  return slides.join("\n\n");
}

async function extractFromSpreadsheet(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim();
    return csv ? `Sheet: ${name}\n${csv}` : "";
  }).filter(Boolean);

  return sheets.join("\n\n");
}

function resolveUploadPath(fileUrl: string) {
  const fileName = fileUrl.split("/").pop();

  if (!fileName) {
    throw new Error("Invalid report file URL");
  }

  return path.join(process.cwd(), "uploads", fileName);
}

export async function extractTextFromReportFile(fileUrl: string, fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const filePath = resolveUploadPath(fileUrl);
  const buffer = await readFile(filePath);

  switch (extension) {
    case ".txt":
    case ".md":
    case ".csv": {
      return buffer.toString("utf8");
    }
    case ".pdf": {
      return extractFromPdf(buffer);
    }
    case ".docx": {
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed.value;
    }
    case ".xlsx":
    case ".xls": {
      return extractFromSpreadsheet(buffer);
    }
    case ".pptx": {
      return extractFromPptx(buffer);
    }
    case ".doc":
    case ".ppt": {
      throw new Error(`Unsupported legacy file format: ${extension}. Please upload modern Office formats.`);
    }
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}
