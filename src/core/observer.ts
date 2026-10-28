/** 观察器只接收通知；同步抛错和异步拒绝均不能改变任务或清理流程。 */
export function notifyObserver(notify: () => unknown): void {
  try {
    void Promise.resolve(notify()).catch(() => undefined)
  } catch {
    // Observer failure is isolated from the operation it observes.
  }
}
