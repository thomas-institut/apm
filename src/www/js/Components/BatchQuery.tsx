import {useState, useEffect, useRef, ReactNode} from 'react';


export interface BatchQueryState<T> {
  loading: boolean;
  results: T[];
  progress: number;
  completedCount: number;
  total: number;
  error: any;
}

interface BatchQueryProps<T> {
  ids: number[];
  fetchFn: (id: number) => Promise<T>;
  concurrency?: number;
  children: (state: BatchQueryState<T>) => ReactNode;
}

export default function BatchQuery<T>(props: BatchQueryProps<T>) {
  const [completedCount, setCompletedCount] = useState(0);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  // Use a ref to prevent accidental re-runs if the parent re-renders
  const hasStarted = useRef(false);

  const concurrency = props.concurrency || 5;

  useEffect(() => {
    if (hasStarted.current || props.ids.length === 0) return;

    hasStarted.current = true;

    const executeBatch = async () => {
      const allResults: T[] = [];
      const queue = [...props.ids];

      // Helper to run a single worker
      const worker = async () => {
        while (queue.length > 0) {
          const id = queue.shift();
          if (!id) {
            break;
          }
          try {
            const data = await props.fetchFn(id);
            allResults.push(data);
          } catch (err) {
            console.error(`Error fetching ID ${id}:`, err);
          } finally {
            setCompletedCount((prev) => prev + 1);
          }
        }
      };

      // Fire off 'n' workers based on concurrency limit
      const workers = Array(Math.min(concurrency, props.ids.length))
      .fill(null)
      .map(() => worker());

      await Promise.all(workers);

      setResults(allResults);
      setLoading(false);
    };

    executeBatch().then( () => { console.log(`Batch query completed for ${props.ids.length} IDs.`)});
  }, [props.ids, props.fetchFn, props.concurrency]);

  // Pass the state back to the children function
  return props.children({
    loading: loading,
    results: results,
    progress: (completedCount / props.ids.length) * 100,
    completedCount: completedCount,
    total: props.ids.length,
    error: error
  });
};

