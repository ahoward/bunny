export type SemVer = {
  readonly major: number
  readonly minor: number
  readonly patch: number
  readonly prerelease: readonly (string | number)[]
  readonly build: readonly string[]
}

export type Comparator = {
  readonly operator: '>=' | '>' | '<=' | '<' | '='
  readonly version: SemVer
}

export type ComparatorSet = readonly Comparator[]

export type Range = readonly ComparatorSet[]

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string }

export type ParseOptions = { readonly loose?: boolean }
