// @ts-nocheck
/**
 * Effect Runtime for React
 *
 * Provides utilities for running Effect programs with the configured layers.
 */

import { Effect, pipe } from 'effect';
import { MainLayer } from '@/lib/effect/layers/Main';

/**
 * Effect Runtime Layer
 *
 * The main application layer with all services provided.
 * Use this to provide services to Effect programs.
 */
export const AppLayer = MainLayer;

/**
 * Run an Effect program synchronously (for values available immediately)
 *
 * WARNING: Only use for synchronous effects. For async operations,
 * use runEffectAsync instead.
 *
 * @param program - Effect program to run
 * @returns Result of the Effect program
 */
export function runEffectSync<A>(program: Effect.Effect<A, never, never>): A {
  return Effect.runSync(
    pipe(program, Effect.provide(AppLayer))
  );
}

/**
 * Run an Effect program asynchronously
 *
 * Use this for most Effect programs that involve async operations
 * like fetching, storage, or computation.
 *
 * @param program - Effect program to run
 * @returns Promise that resolves to the result of the Effect program
 */
export async function runEffectAsync<A>(
  program: Effect.Effect<A, never, never>
): Promise<A> {
  return Effect.runPromise(
    pipe(program, Effect.provide(AppLayer))
  ) as Promise<A>;
}

/**
 * Run an Effect program that may fail
 *
 * Use this for Effect programs that can fail with errors.
 * The error will be thrown if the Effect fails.
 *
 * @param program - Effect program to run
 * @returns Promise that resolves to the result of the Effect program
 * @throws Error if the Effect fails
 */
export async function runEffectAsyncOrFail<E, A, R>(
  program: Effect.Effect<A, E, R>
): Promise<A> {
  const provided = Effect.provide(AppLayer)(program);
  return Effect.runPromise(provided);
}
