import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { TypedEmitter } from "./util";

export function useMemoCleanup<T extends ({ close: () => void } | null)>(builder: () => T, refs: any[]) {
    let ref = useRef<T | null>(null);
    let val = useMemo(() => {
        if (ref.current) { ref.current.close(); }
        ref.current = builder()
        return ref.current;
    }, refs);
    useEffect(() => () => ref.current?.close(), []);
    return val;
}

function forceUpdateReducer(i: number) { return i + 1; }
export function useForceUpdate() {
    const [, forceUpdate] = useReducer(forceUpdateReducer, 0);
    return forceUpdate;
}

export function useInstance<T extends { close: () => void }>(constr: new () => T) {
    let [inst] = useState(() => new constr());
    useEffect(() => () => inst.close(), [inst]);
    return inst;
}

export function useRenderEvent<K extends string>(emitter: TypedEmitter<{ [key in K]: any }>, event: K) {
    let rerender = useForceUpdate();
    useEffect(() => {
        emitter.on(event, rerender);
        return () => emitter.off(event, rerender);
    }, [emitter, event]);
}