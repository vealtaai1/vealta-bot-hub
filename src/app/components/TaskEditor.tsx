"use client";

import { useCallback, useMemo, useState } from "react";

type Attachment = {
  id: string;
  url: string | null;
  mimeType: string | null;
  filename: string;
  createdAt: string;
};

export function TaskEditor({
  projectId,
  defaultColumnId,
  onCreated,
}: {
  projectId: string;
  defaultColumnId: string | null;
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(
    () => title.trim().length > 0 && !!projectId,
    [title, projectId],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!taskId) {
        setError("Save the task first so attachments can be linked.");
        return;
      }

      setUploading(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("taskId", taskId);
        const res = await fetch("/api/attachments", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Upload failed");

        setAttachments((prev) => [json.attachment, ...prev]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [taskId],
  );

  const onPaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      // If user pasted an image (screenshot), upload it and prevent the raw blob
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItem = Array.from(items).find((it) => it.type.startsWith("image/"));
      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      e.preventDefault();
      await uploadFile(file);
    },
    [uploadFile],
  );

  return (
    <div className="space-y-3 rounded-lg border border-neutral-300 p-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">New task</div>
        <div className="text-xs text-neutral-500">
          Paste a screenshot into the description box to upload it.
        </div>
      </div>

      <input
        className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        value={title}
        placeholder="Title"
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="min-h-[140px] w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        value={description}
        placeholder="Description (paste screenshot here)"
        onPaste={onPaste}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <button
          disabled={!canSave || saving}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-40"
          onClick={async () => {
            setSaving(true);
            setError(null);
            try {
              const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  projectId,
                  columnId: defaultColumnId,
                  title: title.trim(),
                  description: description.trim() || undefined,
                }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json?.error ?? "Failed to create task");

              setTaskId(json.task.id);
              setTitle("");
              setDescription("");
              setAttachments([]);
              onCreated?.();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to create task");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save task"}
        </button>
        {uploading ? <div className="text-xs text-neutral-500">Uploading…</div> : null}
        {taskId ? (
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-neutral-500">
              Task created • attachments will link
            </div>
            <button
              type="button"
              className="text-[10px] underline text-neutral-600"
              onClick={() => {
                setTaskId(null);
                setAttachments([]);
                setError(null);
              }}
            >
              Start new
            </button>
          </div>
        ) : null}
        {error ? <div className="text-xs text-red-600">{error}</div> : null}
      </div>

      {attachments.length ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-neutral-600">Attachments</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {attachments.map((a) =>
              a.url ? (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded border border-neutral-200"
                  title={a.filename ?? a.mimeType ?? "attachment"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.url}
                    alt={a.filename ?? "attachment"}
                    className="h-28 w-full object-cover"
                  />
                </a>
              ) : (
                <div
                  key={a.id}
                  className="flex h-28 items-center justify-center text-xs text-neutral-500 rounded border border-neutral-200"
                  title={a.filename ?? a.mimeType ?? "attachment"}
                >
                  (no preview)
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
