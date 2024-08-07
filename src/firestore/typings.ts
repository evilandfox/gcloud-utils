import { CollectionReference } from '@google-cloud/firestore'

declare module '@google-cloud/firestore' {
  interface Firestore {
    collection<K extends Extract<$Entries, { parent: never }>['key']>(
      collectionPath: K
    ): CollectionReference<$MapType[K]>

    collectionGroup<K extends $Key>(
      collectionId: K
    ): CollectionGroup<$MapType[K]>

    doc<T>(documentPath: string): DocumentReference<T>
  }

  interface CollectionReference<T = DocumentData> {
    readonly parentDoc: [
      $FromKey<$FromType<T>['parent']>['type']
    ] extends [infer P]
      ? [P] extends [never]
        ? null
        : DocumentReference<P>
      : never
  }

  interface DocumentReference<T> {
    collection<K extends $FromType<T>['children']>(
      collectionPath: K
    ): CollectionReference<$MapType[K]>
  }

  interface Query<T = DocumentData> {
    where<K extends keyof T>(
      fieldPath: K,
      opStr: WhereFilterOp,
      value: T[K]
    ): Query<T>

    orderBy(
      fieldPath: keyof T,
      directionStr?: OrderByDirection
    ): Query<T>
  }

  interface DocumentSnapshot<T = DocumentData> {
    get<K extends keyof T>(fieldPath: K): T[K]
  }

  /**
   * интерфейс, определяющий древовидную схему Firestore,
   * исходя из которой автоматически типизируются названия и типы коллекций.
   * * key - имя коллекции;
   * * value - непустой кортеж;
   * * value[0] - тип коллекции
   * * value[1], value[2]... - рекурсивная схема вложенных коллекций
   * @example
   * ```ts
   * declare module '@google-cloud/firestore' {
   *   interface CollectionsSchema {
   *     noNested: [{a: number}]
   *     hasNested: [{b: string}, {
   *       childA: [{}]
   *       childB: [{c: boolean}, {
   *         grandChild: [{}]
   *       }]
   *     }]
   *   }
   * }
   * ```
   */
  interface CollectionsSchema {}

  type $Entries = ToDeepEntries<CollectionsSchema, never>
  type $Key = $Entries['key']
  type $MapType = {
    [I in $Entries as I['key']]: I['type']
  }
  type $FromKey<K> = Extract<$Entries, { key: K }>
  type $FromType<T> = {
    [I in $Entries as I['key']]: Equal<I['type'], T, I>
  }[$Key]
}

type Equal<A, B, Then, Else = never> = A extends B
  ? B extends A
    ? Then
    : Else
  : Else

// для преобразования схемы в плоский вид
type ToDeepEntries<S, P> = {
  [K in keyof S]: (S[K] extends [infer U] ? [U, {}] : S[K]) extends [
    infer Type,
    infer Nested
  ]
    ?
        | {
            key: K
            type: Type
            children: keyof Nested
            parent: P
          }
        | ToDeepEntries<Nested, K>
    : never
}[keyof S]

// @ts-ignore
CollectionReference.prototype.parentDoc =
  CollectionReference.prototype.parent
