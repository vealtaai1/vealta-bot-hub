"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TaskEditor } from "@/app/components/TaskEditor";
import { AgentStatusPanel } from "@/app/components/AgentStatusPanel";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ApiTask = {
  id: string;
  number: number;
  title: string;
  columnId: string | null;
  position: number | null;
};

type ApiColumn = {
  id: string;
  name: string;
  position: number;
  tasks: ApiTask[];
};

type ApiProject = {
  id: string;
  name: string;
  columns: ApiColumn[];
};

export default function KanbanPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load projects");
      setProjects(json.projects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const primaryProject = projects[0] ?? null;
  const defaultColumnId = primaryProject?.columns?.[0]?.id ?? null;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <header className="mb-6 flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">PM Hub</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Per-project Kanban. Drag cards between columns.
          </p>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-8 md:col-span-2">
            {loading ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                Loading…
              </div>
            ) : null}

            {!loading && !projects.length ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                No projects yet. Seed a user, then POST /api/projects to create one.
              </div>
            ) : null}

            {projects.map((project) => (
              <ProjectBoard key={project.id} project={project} onChanged={load} />
            ))}
          </div>

          <div className="space-y-4">
            {primaryProject ? (
              <TaskEditor
                projectId={primaryProject.id}
                defaultColumnId={defaultColumnId}
                onCreated={load}
              />
            ) : (
              <div className="rounded-lg border border-neutral-300 p-4 text-xs text-neutral-600">
                Create a project to add tasks.
              </div>
            )}
            <AgentStatusPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectBoard({
  project,
  onChanged,
}: {
  project: ApiProject;
  onChanged: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const columns = useMemo(() => {
    return [...(project.columns ?? [])].sort((a, b) => a.position - b.position);
  }, [project.columns]);

  const allTasks = useMemo(() => {
    const m = new Map<string, ApiTask>();
    for (const c of columns) for (const t of c.tasks ?? []) m.set(t.id, t);
    return m;
  }, [columns]);

  const tasksByColumn = useMemo(() => {
    const m = new Map<string, ApiTask[]>();
    for (const c of columns) {
      const tasks = [...(c.tasks ?? [])].sort((a, b) => {
        const ap = a.position ?? 0;
        const bp = b.position ?? 0;
        return ap - bp;
      });
      m.set(c.id, tasks);
    }
    return m;
  }, [columns]);

  async function persistReorder(columnId: string, taskIds: string[]) {
    await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ columnId, taskIds }),
    });
  }

  async function persistMove(taskId: string, toColumnId: string, toIndex: number) {
    await fetch("/api/tasks/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId, toColumnId, toIndex }),
    });
  }

  async function handleDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    const active = allTasks.get(activeId);
    if (!active) return;

    // overId can be a task id or a column id.
    const overTask = allTasks.get(overId);
    const overColumnId = columns.some((c) => c.id === overId)
      ? overId
      : overTask?.columnId;

    if (!overColumnId) return;

    // Reorder within same column
    if (overTask && overTask.columnId === active.columnId) {
      if (overTask.id === active.id) return;
      const colId = overTask.columnId;
      if (!colId) return;
      const inCol = tasksByColumn.get(colId) ?? [];
      const oldIndex = inCol.findIndex((t) => t.id === active.id);
      const newIndex = inCol.findIndex((t) => t.id === overTask.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(inCol, oldIndex, newIndex);
      await persistReorder(colId, reordered.map((t) => t.id));
      onChanged();
      return;
    }

    // Move across columns (or drop on column)
    const destTasks = tasksByColumn.get(overColumnId) ?? [];
    const nextIndex = overTask
      ? destTasks.findIndex((t) => t.id === overTask.id)
      : destTasks.length;

    await persistMove(active.id, overColumnId, nextIndex < 0 ? destTasks.length : nextIndex);
    onChanged();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{project.name}</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Tasks are numbered sequentially per project.
          </p>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {columns.map((c) => (
            <KanbanColumn
              key={c.id}
              columnId={c.id}
              title={c.name}
              tasks={tasksByColumn.get(c.id) ?? []}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}

function KanbanColumn({
  columnId,
  title,
  tasks,
}: {
  columnId: string;
  title: string;
  tasks: ApiTask[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-black ${
        isOver ? "ring-2 ring-zinc-400 dark:ring-zinc-600" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[56px] flex-col gap-2">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function KanbanCard({ task }: { task: ApiTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${
        isDragging ? "opacity-70" : "opacity-100"
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          #{task.number}
        </span>
      </div>
      <p className="text-sm leading-6">{task.title}</p>
    </div>
  );
}
