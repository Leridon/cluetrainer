type Attachment = {
    type: "object";
    value: any;
} | {
    type: "image";
    value: string;
};
type Message = {
    category: string;
    body: object | string | number;
    attachment?: Attachment;
};
declare namespace Message {
    function toString(msg: Message): string;
    function equals(a: Message, b: Message): boolean;
}
export declare abstract class Log {
    private clone_to;
    constructor(clone_to?: Log);
    protected _log(message: Message): void;
    log(msg: object | string | number, category?: string, attachment?: ImageData | object | any[]): this;
}
export declare namespace Log {
    class Void extends Log {
        protected _log(message: Message): void;
    }
    class Console extends Log {
        _log(message: Message): void;
    }
    type LogBuffer = {
        timestamps: number[];
        message: Message;
    }[];
    class SingleBuffered extends Log {
        entries: {
            timestamps: number[];
            message: Message;
        }[];
        _log(message: Message): void;
        last(): {
            timestamps: number[];
            message: Message;
        };
        first(): {
            timestamps: number[];
            message: Message;
        };
    }
    class DoubleBuffered extends Log {
        private buffers;
        protected _log(message: Message): void;
        get(): LogBuffer;
        toString(): string;
    }
    function log(): DoubleBuffered;
}
export {};
