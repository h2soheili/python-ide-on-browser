export interface IThread {
    id: number;
    reason: string;
}

// TODO: Get multithreading right
export class ThreadWatcher {
    threads: IThread[] = [];

    addThread(id: number, reason: string) {
        this.threads = this.threads.filter((t) => t.id !== id);
        this.threads.push({ id, reason });
    }

    getCurrentThreadId() {
        if (this.threads.length > 0) {
            return this.threads[this.threads.length - 1].id;
        }
        return -1;
    }

    resetThreads(): void {
        this.threads = [];
    }
}

export class ServerStates{
    public disconnectRequest = false;
    public connected = false;
}
