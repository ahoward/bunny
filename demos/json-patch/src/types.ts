export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type AddOperation      = { op: "add";     path: string; value: JsonValue; [key: string]: unknown };
export type RemoveOperation   = { op: "remove";  path: string; [key: string]: unknown };
export type ReplaceOperation  = { op: "replace"; path: string; value: JsonValue; [key: string]: unknown };
export type MoveOperation     = { op: "move";    from: string; path: string; [key: string]: unknown };
export type CopyOperation     = { op: "copy";    from: string; path: string; [key: string]: unknown };
export type TestOperation     = { op: "test";    path: string; value: JsonValue; [key: string]: unknown };

export type Operation = AddOperation | RemoveOperation | ReplaceOperation | MoveOperation | CopyOperation | TestOperation;
export type Patch = Operation[];

export type OkResult<T> = { ok: true;  value: T };
export type ErrResult   = { ok: false; message: string; index: number };
export type Result<T> = OkResult<T> | ErrResult;
