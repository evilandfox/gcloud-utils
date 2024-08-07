/** Базовый контекст */
export interface BaseContext {

}

/** Базовый класс для создания инстанса, позволяющего работать с данными подобно express-middleware */
export class BasicMiddleware<T extends BaseContext> {
  private chain: Array<Function>
  private context: T 

  /** Требуется передача типа Context через дженерик
   * 
   * @example
   * 
   * const simple = new BasicMiddleware<SimpleContext>()
   */
  constructor() {
    this.chain = []
    this.context = undefined!
  }

  private push(f: Function) {
    this.chain.push(f)
  }

  /** Добавить мидлварь
   * 
   * @example simple.use(async (ctx, next) => {
   *  ctx.count++
   *  next()
   * })
   */
  public use(f: (ctx: T, next: () => Promise<void>) => any) {
    this.push(f)
  }

  /** Запустить цепочку мидлварей с переданными данными
   * 
   * @param ctx Данные контекста вида {count: 1}
   * 
   * @example 
   * 
   * simple = new BasicMiddleware<SimpleContext>()
   * simple.use(async (ctx, next) => {
   *  ctx.count++
   *  next()
   * })
   * 
   * const data = await simple.run({count: 1}) // {count: 2}
   */
  public async run(ctx: T) {
    let i = 0
    let chain = this.chain
    this.context = ctx

    const cb = async (i: number, ctx: T) => {
      let nextFunction: Function

      this.context = ctx

      nextFunction = chain[i]
      if (nextFunction) {
        i++;
        await nextFunction(ctx, async () => {
          await cb(i, this.context)
        })
      }
    }

    await cb(i, ctx)

    return this.context
  }
}

