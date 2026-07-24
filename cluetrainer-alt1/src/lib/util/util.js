import { v4 as uuidv4 } from 'uuid';
import lodash from "lodash";
import { levenshteinEditDistance } from "levenshtein-edit-distance";
import { Order } from "../../../lib/cluetrainer-core/src/util/Order";
import { FakeLodash } from "cluetrainer-core/coreutil/FakeLodash";
export var util;
(function (util) {
    function natural_join(a, connector = "and") {
        if (a.length == 0)
            return "";
        if (a.length == 1)
            return a.toString();
        if (a.length == 2)
            return `${a[0]} ${connector} ${a[1]}`;
        return a.slice(0, -1).join(", ") + `, ${connector} ` + a[a.length - 1];
    }
    util.natural_join = natural_join;
    function plural(n, word, postfix = "s") {
        let s = `${n} ${word}`;
        if (n != 1)
            s += postfix;
        return s;
    }
    util.plural = plural;
    function capitalize(s) {
        return s ? s[0].toUpperCase() + s.slice(1) : "";
    }
    util.capitalize = capitalize;
    /**
     * Helper function to easily allow negative indexing to access elements at the back of array
     */
    function index(array, index) {
        return array[(array.length + index) % array.length];
    }
    util.index = index;
    function multiIndex(nArray, ...indices) {
        let x = nArray;
        indices.forEach(i => {
            x = index(x, i);
        });
        return x;
    }
    util.multiIndex = multiIndex;
    function minIndexBy(arr, selector) {
        if (arr.length === 0)
            return -1;
        let minIdx = 0;
        let minVal = selector(arr[0]);
        for (let i = 1; i < arr.length; i++) {
            const v = selector(arr[i]);
            if (v < minVal) {
                minVal = v;
                minIdx = i;
            }
        }
        return minIdx;
    }
    util.minIndexBy = minIndexBy;
    function minIndex(array) {
        return array.indexOf(Math.min(...array));
    }
    util.minIndex = minIndex;
    function shorten_integer_list(l, f = (n => n.toString())) {
        l.sort(Order.natural_order);
        let res = [];
        let start_range = l[0];
        let last = start_range;
        for (let i = 1; i < l.length; i++) {
            let n = l[i];
            if (n <= last + 1)
                last = n;
            else {
                if (last == start_range)
                    res.push(f(last));
                else if (last == start_range + 1)
                    res.push(f(start_range), f(last));
                else
                    res.push(`${f(start_range)} - ${f(last)}`);
                start_range = n;
                last = n;
            }
        }
        if (last == start_range)
            res.push(f(last));
        else if (last == start_range + 1)
            res.push(f(start_range), f(last));
        else
            res.push(`${f(start_range)} - ${f(last)}`);
        return res;
    }
    util.shorten_integer_list = shorten_integer_list;
    function compose(fn1, ...fns) {
        return fns.reduce((prevFn, nextFn) => value => nextFn(prevFn(value)), fn1);
    }
    util.compose = compose;
    function swap(a, b) {
        return [b, a];
    }
    util.swap = swap;
    function count(a, p) {
        return a.reduce((x, y) => x + (p(y) ? 1 : 0), 0);
    }
    util.count = count;
    function signedToString(n) {
        return `${Math.sign(n) < 0 ? "" : "+"}${n}`;
    }
    util.signedToString = signedToString;
    function tap(v, ...fs) {
        fs.forEach(f => f(v));
        return v;
    }
    util.tap = tap;
    function profile(f, name = null) {
        let timeStart = window.performance.now();
        console.log(`Starting task ${name}: `);
        let res = f();
        const ms = (window.performance.now() - timeStart);
        console.log(`Task ${name} took ${ms.toFixed(1)}ms\n`);
        return res;
    }
    util.profile = profile;
    async function profileAsync(f, name = null, start_message = true) {
        let timeStart = window.performance.now();
        if (start_message)
            console.log(`Starting task ${name}: `);
        try {
            return await f();
        }
        finally {
            const ms = (window.performance.now() - timeStart);
            console.log(`Task ${name} took ${ms.toFixed(1)}ms\n`);
        }
    }
    util.profileAsync = profileAsync;
    function avg(...ns) {
        return ns.reduce((a, b) => a + b, 0) / ns.length;
    }
    util.avg = avg;
    function positiveMod(a, b) {
        a += Math.ceil(Math.abs(a / b)) * b;
        return a % b;
    }
    util.positiveMod = positiveMod;
    function uuid() {
        return uuidv4();
    }
    util.uuid = uuid;
    /**
     * @return The current utc time as a unix timestamp (in seconds)
     */
    function timestamp() {
        return Math.floor((new Date()).getTime() / 1000);
    }
    util.timestamp = timestamp;
    async function asyncFilter(collection, predicate) {
        let filters = await Promise.all(collection.map(predicate));
        return collection.filter((e, i) => filters[i]);
    }
    util.asyncFilter = asyncFilter;
    function todo() {
        throw new Error("Not implemented.");
    }
    util.todo = todo;
    function copyUpdate(value, updater) {
        const copy = FakeLodash.cloneDeep(value);
        updater(copy);
        return copy;
    }
    util.copyUpdate = copyUpdate;
    function copyUpdate2(value, updater) {
        const copy = lodash.clone(value);
        updater(copy);
        return copy;
    }
    util.copyUpdate2 = copyUpdate2;
    function cleanedJSON(value, space = undefined) {
        return JSON.stringify(value, (key, value) => {
            if (key.startsWith("_"))
                return undefined;
            return value;
        }, space);
    }
    util.cleanedJSON = cleanedJSON;
    function eqWithNull(f) {
        return (a, b) => (a == b) || (a != null && b != null && f(a, b));
    }
    util.eqWithNull = eqWithNull;
    function downloadTextFile(filename, text) {
        download(filename, 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    }
    util.downloadTextFile = downloadTextFile;
    function download(filename, url) {
        const element = document.createElement('a');
        element.setAttribute('href', url);
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
    util.download = download;
    function downloadBinaryFile(filename, data) {
        download(filename, window.URL.createObjectURL(new Blob([new Uint8Array(data)])));
    }
    util.downloadBinaryFile = downloadBinaryFile;
    /**
     * Opens a file selection dialog and allows the user to select a file. Optionally, restricts the type of files selectable.
     *
     * @param {string} [accept] - A string specifying the accepted file types, for example "image/png"
     * @return {Promise<File>} A promise that resolves to the selected file. If no file is selected, resolves to undefined.
     */
    function selectFile(accept = undefined) {
        return new Promise(resolve => {
            // creating input on-the-fly
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            if (accept) {
                input.setAttribute("accept", accept);
            }
            input.addEventListener("change", (e) => {
                resolve(e.currentTarget.files?.[0]);
            });
            // add onchange handler if you wish to get the file :)
            input.click(); // opening dialog
        });
    }
    util.selectFile = selectFile;
    function stringSimilarity(string, reference) {
        return 1 - levenshteinEditDistance(string, reference, true) / reference.length;
    }
    util.stringSimilarity = stringSimilarity;
    function scoreAll(collection, score_f) {
        return collection.map(e => ({ value: e, score: score_f(e) }));
    }
    util.scoreAll = scoreAll;
    function findBestMatch(collection, score_f, min_score = undefined, inverted = false) {
        const elements = collection.map(e => ({ value: e, score: score_f(e) }));
        if (inverted) {
            const e = FakeLodash.minBy(elements, e => e.score);
            if (min_score != undefined && e.score > min_score)
                return null;
            else
                return e;
        }
        else {
            const e = FakeLodash.maxBy(elements, e => e.score);
            if (min_score != undefined && e.score < min_score)
                return null;
            else
                return e;
        }
    }
    util.findBestMatch = findBestMatch;
    function hslSimilarity(a, b) {
        function hue_delta(a, b) {
            let c = Math.abs(a - b);
            if (c > 128)
                c = 255 - c;
            return c / 128;
        }
        // All components are normalized to the interval [0, 1]
        return (1 - (hue_delta(a[0], b[0]))
            * (1 - (Math.abs(a[1] - b[1]) / 255))
            * (1 - (Math.abs(a[2] - b[2]) / 255)));
    }
    util.hslSimilarity = hslSimilarity;
    function rgbSimilarity(a, b) {
        function channelSimilarity(x, y) {
            return Math.max(0, 1 - Math.abs(x - y) / 128);
        }
        return (channelSimilarity(a[0], b[0])
            + channelSimilarity(a[1], b[1])
            + channelSimilarity(a[2], b[2])) / 3;
    }
    util.rgbSimilarity = rgbSimilarity;
    function rgbContrast(a, b) {
        return 1 - rgbSimilarity(a, b);
    }
    util.rgbContrast = rgbContrast;
    function greatestCommonDivisor(a, b) {
        if (b == 0)
            return Math.abs(a);
        else
            return greatestCommonDivisor(b, a % b);
    }
    util.greatestCommonDivisor = greatestCommonDivisor;
    function sampleImage(img, pos) {
        return img.getPixel(pos.x, pos.y);
    }
    util.sampleImage = sampleImage;
    function positive_mod(x, mod) {
        return ((x % mod) + mod) % mod;
    }
    util.positive_mod = positive_mod;
    function factorial(n, lower = 1) {
        if (n <= lower)
            return 1;
        else
            return n * factorial(n - 1, lower);
    }
    util.factorial = factorial;
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    util.numberWithCommas = numberWithCommas;
    function padInteger(n, length) {
        return lodash.padStart(n.toString(), length, "0");
    }
    util.padInteger = padInteger;
    function chooseRandom(items) {
        return items[Math.floor(Math.random() * items.length)];
    }
    util.chooseRandom = chooseRandom;
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return `${padInteger(date.getHours(), 2)}:${padInteger(date.getMinutes(), 2)}:${padInteger(date.getSeconds(), 2)}.${padInteger(date.getMilliseconds(), 4)}`;
    }
    util.formatTime = formatTime;
    function formatTimeWithoutMilliseconds(timestamp) {
        const date = new Date(timestamp);
        return `${padInteger(date.getHours(), 2)}:${padInteger(date.getMinutes(), 2)}:${padInteger(date.getSeconds(), 2)}`;
    }
    util.formatTimeWithoutMilliseconds = formatTimeWithoutMilliseconds;
    class AsyncInitialization {
        _is_initialized = false;
        _value = undefined;
        promise;
        constructor(f) {
            this.promise = f().then(v => {
                this._is_initialized = true;
                this._value = v;
                return v;
            });
        }
        isInitialized() {
            return this._is_initialized;
        }
        wait() {
            return this.promise;
        }
        get() {
            return this._value;
        }
    }
    util.AsyncInitialization = AsyncInitialization;
    function async_init(f) {
        return new AsyncInitialization(f);
    }
    util.async_init = async_init;
    async function delay(t) {
        return new Promise(done => setTimeout(done, t));
    }
    util.delay = delay;
    function renderTimespan(milliseconds) {
        const SECOND = 1000;
        const MINUTE = 60 * SECOND;
        const HOUR = 60 * MINUTE;
        const DAY = 24 * HOUR;
        if (milliseconds > 2 * DAY)
            return plural(Math.floor(milliseconds / DAY), "day");
        if (milliseconds > 3 * HOUR)
            return plural(Math.floor(milliseconds / HOUR), "hour");
        if (milliseconds > 2 * MINUTE)
            return plural(Math.floor(milliseconds / MINUTE), "minute");
        return plural(Math.floor(milliseconds / SECOND), "second");
    }
    util.renderTimespan = renderTimespan;
    async function findAsync(arr, asyncCallback) {
        const promises = arr.map(asyncCallback);
        const results = await Promise.all(promises);
        const index = results.findIndex(result => result);
        return arr[index];
    }
    util.findAsync = findAsync;
    function median(list) {
        if (list.length == 0)
            return Number.NaN;
        const sorted = FakeLodash.sortByComparator(list, Order.natural_order);
        const mid = ~~(sorted.length / 2);
        return sorted[mid];
    }
    util.median = median;
    function makeCSV(data, separator = "\t") {
        return (...cols) => {
            return [
                cols.map(c => c.name).join(separator),
                ...data.map(e => cols.map(c => c.f(e)).join(separator))
            ].join("\n");
        };
    }
    util.makeCSV = makeCSV;
    /**
     * Removes elements from both ends of an array as long as they satisfy the given predicate.
     *
     * @param {T[]} arr - The array to process.
     * @param {(item: T) => boolean} predicate - A function that tests each element of the array.
     * @return {T[]} A new array with elements removed from the beginning and end that satisfy the predicate.
     */
    function dropWhileBidirectional(arr, predicate) {
        let start = 0, end = arr.length - 1;
        while (start <= end && predicate(arr[start]))
            start++;
        while (end >= start && predicate(arr[end]))
            end--;
        return arr.slice(start, end + 1);
    }
    util.dropWhileBidirectional = dropWhileBidirectional;
})(util || (util = {}));
