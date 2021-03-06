import sqlite3 from 'sqlite3';

class Database {
    /**
     * 原始的sqlite3数据库连接
     */
    private readonly _db: sqlite3.Database;

    private constructor(db: sqlite3.Database) {
        this._db = db;
    }

    static get OPEN_READONLY(): number {
        return sqlite3.OPEN_READONLY;
    }

    static get OPEN_READWRITE(): number {
        return sqlite3.OPEN_READWRITE;
    }

    static get OPEN_CREATE(): number {
        return sqlite3.OPEN_CREATE;
    }

    /**
     * 开启以显示更多的错误消息。注意！这会严重影响数据库的性能
     */
    static verbose(): typeof Database {
        sqlite3.verbose();
        return Database;
    }

    /**
     * 根据文件路径异步打开sqlite数据库
     * @param filename sqlite数据库的文件路径
     * @param mode 连接模式。默认 mode=Database.OPEN_CREATE | Database.OPEN_READWRITE
     * @param cached 是否使用之前打开过的连接，默认false
     */
    static connectDB(filename: string, mode?: number, cached?: boolean): Promise<Database> {
        return new Promise<Database>(function (resolve, reject) {
            mode = mode === undefined ? Database.OPEN_CREATE | Database.OPEN_READWRITE : mode;

            if (cached === true) {
                const db = sqlite3.cached.Database(filename, mode, function (err) {
                    err ? reject(err) : resolve(new Database(db));
                });
            } else {
                const db = new sqlite3.Database(filename, mode, function (err) {
                    err ? reject(err) : resolve(new Database(db));
                });
            }
        });
    }

    /**
     * 关闭数据库连接
     */
    close(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._db.close(err => err ? reject(err) : resolve());
        });
    }

    on(event: 'trace', listener: (sql: string) => void): void;
    on(event: 'profile', listener: (sql: string, time: number) => void): void;
    on(event: 'error', listener: (err: Error) => void): void;
    on(event: 'open' | 'close', listener: () => void): void;
    on(event: string, callback: (...param: any[]) => void): void {
        this._db.on(event, callback);
    }

    /**
     * 执行"单条"sql语句(多条语句只执行第一条)，不返回sql执行结果。如果执行的是INSERT操作则返回插入id lastID，如果是UPDATE或DELETE 则会返回受影响的行数changes
     * @param sql 执行的sql语句
     * @param param 如果sql中使用了占位符，则可在这传递参数
     */
    run(sql: string, ...param: any[]): Promise<{ lastID: number; changes: number }> {
        return new Promise((resolve, reject) => {
            this._db.run(sql, ...param, function (this: sqlite3.RunResult, err: Error | null) {
                err ? reject(err) : resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    /**
     * 执行一条sql查询，返回第一行结果。结果按照{列名：值}键值对的形式返回。如果查询结果为空则返回undefined
     * @param sql sql查询语句
     * @param param 如果sql中使用了占位符，则可在这传递参数
     */
    get(sql: string, ...param: any[]): Promise<{ [key: string]: any } | undefined> {
        return new Promise((resolve, reject) => {
            this._db.get(sql, param, function (err: Error | null, row: any) {
                err ? reject(err) : resolve(row);
            });
        });
    }

    /**
     * 执行一条sql查询，返回所有结果。结果按照{列名：值}键值对数组的形式返回。如果查询结果为空则返回空数组
     * @param sql sql查询语句
     * @param param 如果sql中使用了占位符，则可在这传递参数
     */
    all(sql: string, ...param: any[]): Promise<{ [key: string]: any }[]> {
        return new Promise((resolve, reject) => {
            this._db.all(sql, param, function (err: Error | null, rows: any[]) {
                err ? reject(err) : resolve(rows);
            });
        });
    }

    /**
     * 执行多条sql语句，不返回任何结果。如果其中一条sql语句执行失败，则后续的sql语句将不会被执行（可以利用事务包裹所有语句来确保执行结果与预料一致）。
     * @param sql 要执行的sql语句
     */
    exec(sql: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._db.exec(sql, function (err) {
                err ? reject(err) : resolve();
            });
        });
    }
}

export = Database;