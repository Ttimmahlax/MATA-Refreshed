/* tslint:disable */
/* eslint-disable */
export function wasm_main(): void;
export function generate_keypair(): KeyPair;
export function derive_key(password: string, existing_salt?: string | null): any;
export function encrypt_private_key(keypair: KeyPair, derived_key: string): string;
export function decrypt_private_key(encrypted_key: string, derived_key: string): Uint8Array;
export function generate_random_key(): string;
export function encrypt_data(data: string, key: string): string;
export function decrypt_data(encrypted_data: string, key: string): string;
export class KeyPair {
  private constructor();
  free(): void;
  readonly publicKey: string;
  readonly privateKey: Uint8Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly wasm_main: () => void;
  readonly __wbg_keypair_free: (a: number, b: number) => void;
  readonly keypair_publicKey: (a: number, b: number) => void;
  readonly keypair_privateKey: (a: number, b: number) => void;
  readonly generate_keypair: (a: number) => void;
  readonly derive_key: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly encrypt_private_key: (a: number, b: number, c: number, d: number) => void;
  readonly decrypt_private_key: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
