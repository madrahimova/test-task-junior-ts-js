import { IExecutor } from './Executor';
import ITask from './Task';

export default async function run(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0) {
    maxThreads = Math.max(0, maxThreads);

    const getLength = async (iterator: any) => {
        return iterator.q.length;
    };

    const tasksSet: any = {};
    const isEmpty = !await getLength(queue);

    let currentTasks: Array<Promise<any>> = [];
    const tasks: ITask[] = [];

    for await (const task of queue) {
        tasks.push(task);
        if (isEmpty && tasks.length === maxThreads) {
            break;
        }
    }

    const tasksCount = await getLength(queue);

    while (tasks.length) {
        let tNo = 0;
        while (tasks.length > tNo) {
            const task = tasks[tNo];
            if (currentTasks.length >= maxThreads && maxThreads > 0) {
                break;
            }
            if (!tasksSet[task.targetId]) {
                tasks.splice(tNo, 1);
                tasksSet[task.targetId] = task;
                const currentTask = executor.executeTask(task).then(async () => {
                    delete tasksSet[task.targetId];
                    currentTasks = currentTasks.filter(item => item !== currentTask);
                    if (tasksCount === !await getLength(queue) || isEmpty) {
                        for await (const t of queue) {
                            tasks.push(t);
                            break;
                        }
                    } else {
                        for await (const t of queue) {
                            tasks.push(t);
                        }
                    }
                });
                currentTasks.push(currentTask);
            } else {
                tNo++;
            }
        }
        await Promise.race(currentTasks);
    }
    await Promise.all(currentTasks);
}
