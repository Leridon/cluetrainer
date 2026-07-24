import { lazy } from "../Lazy";
import { util } from "./util";
var Message;
(function (Message) {
    var cleanedJSON = util.cleanedJSON;
    function toString(msg) {
        const cat = msg.category ? `[${msg.category}] ` : "";
        if (typeof msg.body == "string")
            return cat + msg.body;
        else
            return cat + cleanedJSON(msg.body);
    }
    Message.toString = toString;
    function equals(a, b) {
        return a.body == b.body && a.category == b.category && !a.attachment && !b.attachment;
    }
    Message.equals = equals;
})(Message || (Message = {}));
export class Log {
    clone_to;
    constructor(clone_to = undefined) {
        this.clone_to = clone_to;
    }
    _log(message) {
        this.clone_to?._log(message);
    }
    log(msg, category = undefined, attachment = undefined) {
        const attach = (() => {
            if (attachment instanceof ImageData) {
                return { type: "image", value: "data:image/png;base64," + attachment.toPngBase64() };
            }
            else if (attachment != undefined) {
                return { type: "object", value: attachment };
            }
        })();
        this._log({ body: msg, category: category ?? "", attachment: attach });
        return this;
    }
}
(function (Log) {
    var index = util.index;
    class Void extends Log {
        _log(message) {
            super._log(message);
        }
    }
    Log.Void = Void;
    class Console extends Log {
        _log(message) {
            super._log(message);
            console.log(Message.toString(message));
        }
    }
    Log.Console = Console;
    let Buffer;
    (function (Buffer) {
        var formatTime = util.formatTime;
        function toString(buffer) {
            return buffer.map(entry => {
                if (entry.timestamps.length > 1) {
                    return `${formatTime(entry.timestamps[0])} - ${Message.toString(entry.message)} (${entry.timestamps.length}x until ${formatTime(index(entry.timestamps, -1))})`;
                }
                else {
                    return `${formatTime(entry.timestamps[0])} - ${Message.toString(entry.message)}`;
                }
            }).join("\n");
        }
        Buffer.toString = toString;
    })(Buffer || (Buffer = {}));
    class SingleBuffered extends Log {
        entries = [];
        _log(message) {
            super._log(message);
            if (this.entries.length > 0 && Message.equals(message, index(this.entries, -1).message)) {
                index(this.entries, -1).timestamps.push(Date.now());
            }
            else {
                this.entries.push({ timestamps: [Date.now()], message: message });
            }
        }
        last() {
            return index(this.entries, -1);
        }
        first() {
            return index(this.entries, 0);
        }
    }
    Log.SingleBuffered = SingleBuffered;
    class DoubleBuffered extends Log {
        buffers = [new SingleBuffered(), new SingleBuffered()];
        _log(message) {
            super._log(message);
            this.buffers[0]._log(message);
            if (this.buffers[0].entries.length > 10000) {
                this.buffers[1] = this.buffers[0];
                this.buffers[0] = new SingleBuffered();
            }
        }
        get() {
            return [...this.buffers[1].entries, ...this.buffers[0].entries];
        }
        toString() {
            return Buffer.toString(this.get());
        }
    }
    Log.DoubleBuffered = DoubleBuffered;
    const _instance = lazy(() => new DoubleBuffered(new Console()));
    function log() {
        return _instance.get();
    }
    Log.log = log;
})(Log || (Log = {}));
