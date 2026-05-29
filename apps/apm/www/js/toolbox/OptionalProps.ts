export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

export type OptionalProps<T> = Pick<T, OptionalKeys<T>>

export type OptionalPropsRequired<T> = Required<OptionalProps<T>>