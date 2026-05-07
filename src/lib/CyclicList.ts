export class CyclicList<T> implements Iterable<T> {
  private cur = 0;
  constructor(public items: Array<T> = []) {}

  [Symbol.iterator]() {
    return (function* (list) {
      const n = list.size;
      for (let i = 0; i < n; ++i) {
        yield list.get(i);
      }
    })(this);
  }

  public get size() {
    return this.items.length;
  }

  public clone(): CyclicList<T> {
    return new CyclicList(this.items);
  }

  public rotate(k: number) {
    this.items = [...this.items.slice(k), ...this.items.slice(0, k)];
  }

  public get(i: number): T {
    i %= this.size;
    if (i < 0) i += this.size;
    return this.items[i];
  }

  public push(...items: Array<T>) {
    this.items.push(...items);
  }

  public delete(i: number): void {
    i %= this.size;
    if (i < 0) i += this.size;
    this.items.splice(i, 1);
  }

  public insert(i: number, ...items: Array<T>): void {
    i %= this.size;
    if (i < 0) i += this.size;
    this.items.splice(i, 0, ...items);
  }

  public map<U>(f: (v: T, i: number) => U): CyclicList<U> {
    return new CyclicList(this.items.map(f));
  }
}
