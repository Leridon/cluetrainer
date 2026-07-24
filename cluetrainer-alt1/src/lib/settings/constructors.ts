import z, {ZodBoolean, ZodCatch, ZodNumber, ZodObject, ZodPrefault} from "zod";
import * as core from "zod/v4/core";
import {$strip} from "zod/v4/core";
import {Writeable} from "zod/v3";

export function object<T extends core.$ZodLooseShape = Partial<Record<never, core.SomeType>>>(shape: T): ZodPrefault<ZodObject<Writeable<T>, $strip>> {
  return z.object(shape).prefault(() => ({} as any))
}

export function int(min: number, max: number, default_value: number): ZodCatch<ZodNumber> {
  return z.number().int().min(min).max(max).catch(default_value);
}

export function boolean(default_value: boolean): ZodCatch<ZodBoolean> {
  return z.boolean().catch(default_value);
}

export type AsType<T> = z.infer<T>;