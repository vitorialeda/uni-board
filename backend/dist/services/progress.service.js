// backend/src/services/progress.service.ts
export function calculateProgress(tasks, evaluations) {
    const hasTasks = tasks.length > 0;
    const hasEvals = evaluations.length > 0;
    if (!hasTasks && !hasEvals)
        return 0;
    const taskScore = hasTasks
        ? tasks.filter(t => t.completed).length / tasks.length
        : null;
    const evalScore = hasEvals
        ? evaluations.filter(e => e.completed).length / evaluations.length
        : null;
    if (taskScore === null)
        return evalScore;
    if (evalScore === null)
        return taskScore;
    return taskScore * 0.5 + evalScore * 0.5;
}
