/**
 * Extracts RPC signature from HTTP handler function.
 * Converts handler context types to client-callable functions with Promise return types.
 *
 * The helper reads the request and the response of the handler context. It
 * does not match the context against a fixed `Ctx*` type, because a handler
 * declares one scope (for example `"project"`) and a fixed pattern holds every
 * scope. A function parameter is contravariant, so such a pattern never
 * matches and the result is always `never`.
 *
 * @template T - Handler function type
 * @returns Function signature for the generated API client
 *
 * @example
 * // Backend handler
 * export default function handle(ctx: CtxPost<CreateBody, Response>) { ... }
 * export type Handle = typeof handle;
 *
 * // Generated API client method
 * api.global.create: (body: CreateBody, query?: Partial<{}>) => Promise<Response>
 */

/** The response body type of a handler context. */
type ResponseBodyOf<C> = C extends { response: { json(object: infer R): void } } ? R : never;

/** The query parameter type of a handler context. */
type QueryParamsOf<C> = C extends { request: { query: infer Q } } ? Q : never;

/** The request body type of a handler context. GET and DELETE give `never`. */
type RequestBodyOf<C> = C extends { request: { json(): infer B } } ? B : never;

export type ExtractRPCFromHandler<T> = T extends (ctx: infer C) => void
  ? [RequestBodyOf<C>] extends [never]
    ? (query?: Partial<QueryParamsOf<C>>) => Promise<ResponseBodyOf<C>>
    : (
        body: RequestBodyOf<C>,
        query?: Partial<QueryParamsOf<C>>
      ) => Promise<ResponseBodyOf<C>>
  : never;
