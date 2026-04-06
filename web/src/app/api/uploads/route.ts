import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".md",
  ".csv",
  ".xlsx",
  ".xls",
  ".ppt",
  ".pptx",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50 MB." },
        { status: 400 },
      );
    }

    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `File type "${ext}" is not allowed.` },
        { status: 400 },
      );
    }

    // Generate a safe, unique filename: <random>-<timestamp><ext>
    const uniqueId = crypto.randomBytes(16).toString("hex");
    const safeFileName = `${uniqueId}-${Date.now()}${ext}`;

    await mkdir(UPLOAD_DIR, { recursive: true });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const filePath = path.join(UPLOAD_DIR, safeFileName);
    await writeFile(filePath, bytes);

    return NextResponse.json(
      {
        data: {
          fileName: originalName,
          storedName: safeFileName,
          fileSize: file.size,
          url: `/api/uploads/${safeFileName}`,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
