

interface Action<I, T> {
   execute(input: I): Promise<T>;
}