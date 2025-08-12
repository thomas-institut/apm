export class IndexedDbKeyCache {

  private readonly dbName: string;
  private readonly storeName: string;
  private readonly versionNumber: number;
  private db!: IDBDatabase;
  private status: string;
  constructor(dbName: string, version: number, storeName: string = dbName) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.versionNumber = version;
    this.status = 'NotInitialized';
  }

  public getStatus(): string {
    return this.status;
  }

  public initialize(): Promise<boolean> {
    return new Promise((resolve) => {
      const DBOpenRequest = window.indexedDB.open(this.dbName, this.versionNumber);
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
        console.log(`Upgrading database from version ${event.oldVersion} to version ${event.newVersion}`)
        this.db = DBOpenRequest.result;
        const store = this.db.createObjectStore(this.storeName, {keyPath: 'key'});
        store.createIndex('value', 'value', {unique: false});
      }
    });
  }

  public async store(key: string, value: any) : Promise<void> {
    return new Promise ( (resolve, reject) => {
      const store = this.db.transaction(this.storeName, 'readwrite').objectStore(this.storeName);
      const req = store.put({key: key, value: value});
      req.onsuccess = () => {
        resolve();
      };
      req.onerror = () =>{
        reject();
      }
    })
  }

  public async retrieve(key: string) : Promise<any> {
    return new Promise ( (resolve, reject) => {
      const store = this.db.transaction(this.storeName, 'readonly').objectStore(this.storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result === undefined) {
          resolve(null);
          return;
        }
        resolve(req.result.value ?? null);
      };
      req.onerror = () =>{
        reject();
      }
    })
  }

}