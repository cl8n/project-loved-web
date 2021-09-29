interface QueueItem {
  hash: symbol;
  promise: Promise<void>;
  resolve: () => void;
}

export default class Limiter {
  #delayBetween: number;
  #lastRun = 0;
  #running: QueueItem[] = [];
  #waiting: QueueItem[] = [];

  constructor(delayBetween: number) {
    this.#delayBetween = delayBetween;
  }

  run<T>(job: () => T | Promise<T>): Promise<T> {
    const id = Symbol();
    const promise = this.#wait(id).then(job);
    promise.finally(() => this.#end(id));

    return promise;
  }

  #end(hash: symbol): void {
    const itemIndex = this.#running.findIndex((x) => x.hash === hash);

    if (itemIndex === -1) {
      throw 'Queue desync';
    }

    this.#running.splice(itemIndex, 1)[0].resolve();

    const nextItem = this.#waiting.shift();

    if (nextItem != null) {
      nextItem.resolve();
    }
  }

  async #wait(hash: symbol): Promise<void> {
    const item: Partial<QueueItem> = { hash };

    if (this.#running.length > 0) {
      item.promise = new Promise((resolve) => {
        item.resolve = resolve;
      });

      this.#waiting.push(item as QueueItem);
      await item.promise;
    }

    item.promise = new Promise((resolve) => {
      item.resolve = resolve;
    });

    this.#running.push(item as QueueItem);

    while (Date.now() - this.#lastRun < this.#delayBetween) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.#delayBetween - (Date.now() - this.#lastRun)),
      );
    }

    this.#lastRun = Date.now();
  }
}
