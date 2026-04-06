import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/serverAuth";
import { requireProjectRole } from "@/lib/rbac";

// POST /api/attachments
// multipart/form-data: file=<File>, taskId=<string>
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const taskId = form.get("taskId")?.toString() || "";

  if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  await requireProjectRole(task.projectId, "MEMBER");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const contentType = file.type || "application/octet-stream";
  const ext = file.name?.split(".").pop();
  const safeExt = ext && ext.length <= 8 ? `.${ext}` : "";
  const storageKey = `attachments/${crypto.randomUUID()}${safeExt}`;

  const blob = await put(storageKey, file, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });

  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId,
      uploadedById: user.id,
      url: blob.url,
      storageKey,
      mimeType: contentType,
      filename: file.name || "upload" + safeExt,
      sizeBytes: file.size || undefined,
    },
  });

  return NextResponse.json({ attachment });
}

// GET /api/attachments?taskId=...
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId") || "";
  if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  await requireProjectRole(task.projectId, "VIEWER");

  const attachments = await prisma.taskAttachment.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ attachments });
}
