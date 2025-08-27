import {InternalCacheObject, KeyCache} from "@/toolbox/KeyCache/KeyCache";


const VersionNumber = 2;
const storeName = 'cache';

export class IndexedDbKeyCache extends KeyCache {

  private readonly dbName: string;
  private readonly storeName: string;
  private db!: IDBDatabase;
  private status: string;

  /**
   * Creates a new IndexedDbKeyCache on the given IndexedDB database.
   *
   * The database is created if it does not exist and is meant to be exclusively used by this
   * KeyCache instance. It should not be created or upgraded by any other means except by the
   * initialize() method in this instance.
   *
   * @param dbName - the name of the database to use
   * @param dataId - default dataId to use for all entries
   */
  constructor(dbName: string, dataId: string = '') {
    super(dataId);
    this.dbName = dbName;
    this.storeName = storeName;
    this.status = 'NotInitialized';
  }


  public initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      const DBOpenRequest = window.indexedDB?.open(this.dbName, VersionNumber);
      if (DBOpenRequest === undefined) {
        console.log('IndexedDB not supported in this browser.');
        resolve(false);
      }
      // Register two event handlers to act on the database being opened successfully, or not
      DBOpenRequest.onerror = () => {
        this.status = 'error';
        resolve(false);
      };
      DBOpenRequest.onsuccess = () => {
        this.db = DBOpenRequest.result;
        this.status = 'success';
        resolve(true);
      };
      DBOpenRequest.onupgradeneeded = (event) => {
        console.log(`Upgrading database from version ${event.oldVersion} to version ${event.newVersion}`);
        this.db = DBOpenRequest.result;
        const store = this.db.createObjectStore(this.storeName, {keyPath: 'key'});
        store.createIndex('value', 'value', {unique: false});
      };
    });
  }

  protected async storeItemObject(key: string, value: InternalCacheObject): Promise<void> {
    if (this.status !== 'success') {
      throw new Error('Database not initialized');
    }
    const store = this.db.transaction(this.storeName, 'readwrite').objectStore(this.storeName);
    await getRequestResult(() => store.put({key: key, value: value}));
  }

  protected async getItemObject(key: string): Promise<InternalCacheObject | null> {
    if (this.status !== 'success') {
      throw new Error('Database not initialized');
    }
    const store = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName);
    const result = await getRequestResult(() => store.get(key));
    if (result === undefined) {
      return null;
    }
    return result.value ?? null;
  }

  protected async deleteItemObject(key: string): Promise<void> {
    if (this.status !== 'success') {
      throw new Error('Database not initialized');
    }
    const store = this.db.transaction(this.storeName, 'readwrite').objectStore(this.storeName);
    await getRequestResult(() => store.delete(key));
  }

  protected async getKeys(): Promise<string[]> {
    if (this.status !== 'success') {
      throw new Error('Database not initialized');
    }
    const store = this.db.transaction(this.storeName, 'readwrite').objectStore(this.storeName);
    return await getRequestResult(() => store.getAllKeys());
  }

}

function getRequestResult(makeRequest: () => IDBRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = makeRequest();
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });

}