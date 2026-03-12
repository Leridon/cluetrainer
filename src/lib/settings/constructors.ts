import z, {ZodBoolean, ZodCatch, ZodNumber, ZodObject} from "zod";
import * as core from "zod/v4/core";
import {util} from "zod/v4/core";

export function object<T extends core.$ZodLooseShape = Partial<Record<never, core.SomeType>>>(shape: T): ZodObject<util.Writeable<T>, core.$strip> {
  return z.object(shape)
}

export function int(min: number, max: number, default_value: number): ZodCatch<ZodNumber> {
  return z.number().int().min(min).max(max).catch(default_value);
}

export function boolean(default_value: boolean): ZodCatch<ZodBoolean> {
  return z.boolean().catch(default_value);
}

export type AsType<T> = z.infer<T>;