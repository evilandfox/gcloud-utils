import { HttpGenericError, type ApiHandlerContext } from '../server'

/** json-данные сообщения, прилетаемые в body от pubsub подписки в режиме push */
export interface RawPubsubMessage {
  message: {
    /** base64-encoded json payload */
    data: string
    attributes: Record<string, string>
    messageId: string
    /** JS ISO date string */
    publishTime: string

    message_id: string
    publish_time: string
  }
  subscription: string
}

/** дополнительные данные сообщения */
export interface PubsubMessageMeta<
  A extends Record<string, string> = Record<string, string>
> {
  attributes: A
  messageId: string
  publishTime: string
  subscription: string
}

/**
 * Тип callable, являющейся [push-подпиской](https://cloud.google.com/pubsub/docs/subscriber#push-subscription) у pubsub-топика
 */
export interface PubsubPushSubscription {
  (payload: RawPubsubMessage): Promise<void>
}

/**
 * Обертка callable, являющейся [push-подпиской](https://cloud.google.com/pubsub/docs/subscriber#push-subscription) у pubsub-топика
 *
 * При получении очередного сообщения подписки резолвит оттуда искомый объект данных
 * и вызывает callable с этим значением
 */
export function wrapPubsubSubscription<
  T = unknown,
  A extends Record<string, string> = Record<string, string>
>(
  handler: (payload: T, meta: PubsubMessageMeta<A>) => Promise<void>
): PubsubPushSubscription {
  return async function (
    this: ApiHandlerContext,
    payload: RawPubsubMessage
  ) {
    if (!payload) {
      throw new HttpGenericError(400, 'Empty pubsub message received')
    }
    const { message } = payload
    let jsonPayload: T
    try {
      jsonPayload = JSON.parse(
        Buffer.from(message.data, 'base64').toString('utf8')
      )
    } catch (error) {
      throw new HttpGenericError(400, 'Cannot parse pubsub message', {
        payload
      })
    }
    const metadata: PubsubMessageMeta<A> = {
      attributes: message.attributes as A,
      messageId: message.messageId ?? message.message_id,
      publishTime: message.publishTime ?? message.publish_time,
      subscription: payload.subscription
    }
    await handler.call(this, jsonPayload, metadata)
  }
}
