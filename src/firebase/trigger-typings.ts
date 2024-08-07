/** Типизация триггеров Firebase */

/// <reference types="firebase-functions/v1/firestore" />
/// <reference types="firebase-functions/v1/pubsub" />

import type * as firestore from 'firebase-admin/firestore'
import type {
  Change,
  CloudFunction,
  EventContext,
  SUPPORTED_REGIONS
} from 'firebase-functions'
import type { ParamsOf } from 'firebase-functions/lib/common/params'

export type FunctionsSupportedRegion =
  typeof SUPPORTED_REGIONS[number]

declare module 'firebase-functions/v1/firestore' {
  export interface DocumentBuilder<Path extends string> {
    onWrite<T>(
      handler: (
        change: Change<firestore.DocumentSnapshot<T>>,
        context: EventContext<ParamsOf<Path>>
      ) => PromiseLike<any> | any
    ): CloudFunction<Change<firestore.DocumentSnapshot<T>>>

    onUpdate<T>(
      handler: (
        change: Change<firestore.QueryDocumentSnapshot<T>>,
        context: EventContext<ParamsOf<Path>>
      ) => PromiseLike<any> | any
    ): CloudFunction<Change<firestore.QueryDocumentSnapshot<T>>>

    onCreate<T>(
      handler: (
        snapshot: firestore.QueryDocumentSnapshot<T>,
        context: EventContext<ParamsOf<Path>>
      ) => PromiseLike<any> | any
    ): CloudFunction<firestore.QueryDocumentSnapshot<T>>

    onDelete<T>(
      handler: (
        snapshot: firestore.QueryDocumentSnapshot<T>,
        context: EventContext<ParamsOf<Path>>
      ) => PromiseLike<any> | any
    ): CloudFunction<firestore.QueryDocumentSnapshot<T>>
  }
}

export interface PubsubTriggerMessage<T> {
  readonly data: string
  readonly attributes: {
    [key: string]: string
  }
  get json(): T
  toJSON(): any
}

declare module 'firebase-functions/v1/pubsub' {
  export interface TopicBuilder {
    onPublish<T>(
      handler: (
        message: PubsubTriggerMessage<T>,
        context: EventContext
      ) => PromiseLike<any> | any
    ): CloudFunction<Message>
  }
}
