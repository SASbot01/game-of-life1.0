import { differenceInHours } from "date-fns";

/**
 * Filters out tasks that have been in "done" status for more than 24 hours.
 * These tasks are NOT deleted, just hidden from active views.
 */
export function filterVisibleTasks<T extends { status: string; completed_at: string | null }>(
  tasks: T[]
): T[] {
  return tasks.filter((task) => {
    // Show all non-done tasks
    if (task.status !== "done") {
      return true;
    }
    
    // For done tasks, only show if completed within last 24 hours
    if (task.completed_at) {
      const hoursSinceCompletion = differenceInHours(new Date(), new Date(task.completed_at));
      return hoursSinceCompletion < 24;
    }
    
    // If done but no completed_at timestamp, show it (edge case)
    return true;
  });
}

/**
 * Counts tasks excluding those done for more than 24 hours
 */
export function countVisibleTasks<T extends { status: string; completed_at: string | null }>(
  tasks: T[]
): { total: number; completed: number } {
  const visibleTasks = filterVisibleTasks(tasks);
  return {
    total: visibleTasks.length,
    completed: visibleTasks.filter((t) => t.status === "done").length,
  };
}
