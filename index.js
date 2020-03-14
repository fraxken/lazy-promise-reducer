"use strict";

// Require Node.js Dependencies
const { EventEmitter } = require("events");
const { promisify } = require("util");
const { performance } = require("perf_hooks");

// Require Third-party Dependencies
const Locker = require("@slimio/lock");

// Require Internal Dependencies
const { makeQuerablePromise } = require("./src/utils");

// VARS
const nextEventLoopTick = promisify(setImmediate);

// eslint-disable-next-line func-style
const kDoNothing = () => {
    /** DO NOTHING ! */
};

class LazyPromiseReducer extends EventEmitter {
    total = 0;
    count = 0;
    scheduleNextLoopTick = false;
    allValues = [];
    reduceCallback = null;

    constructor(callback, maxConcurrent = 0) {
        super();
        if (typeof callback !== "function") {
            throw new TypeError("callback must be a function!");
        }
        this.forEachCallback = callback;
        this.startTime = performance.now();
        if (maxConcurrent !== 0) {
            this.lock = new Locker({ maxConcurrent });
        }
    }

    get elapsedTime() {
        return performance.now() - this.startTime;
    }

    reduce(callback, initialValue) {
        if (typeof callback !== "function") {
            throw new TypeError("callback must be a function!");
        }
        this.reduceCallback = callback;
        this.currentValue = initialValue;

        return this;
    }

    async fromAsyncIterable(asyncIterable) {
        for await (const value of asyncIterable) {
            this.push(value);
        }

        return this;
    }

    processFulfilledPromises() {
        let index = this.allValues.length;
        while (index--) {
            if (!this.allValues[index].isFulfilled()) {
                continue;
            }

            this.allValues[index].then((value) => {
                if (this.reduceCallback !== null) {
                    this.currentValue = this.reduceCallback(this.currentValue, value);
                }
                this.count++;
                setImmediate(() => this.emit("count", this.count));
            }).catch(kDoNothing);
            this.allValues.splice(index, 1);
            if (this.lock) {
                this.lock.freeOne();
            }
        }
    }

    async pushLock(value) {
        this.total++;
        await this.lock.acquireOne();

        return this.push(value, false);
    }

    push(value, incrTotal = true) {
        if (incrTotal) {
            this.total++;
        }
        this.allValues.push(makeQuerablePromise(this.forEachCallback(value).catch(kDoNothing)));

        if (!this.scheduleNextLoopTick) {
            this.scheduleNextLoopTick = true;
            setImmediate(() => {
                this.processFulfilledPromises();
                this.scheduleNextLoopTick = false;
            });
        }

        return this;
    }

    async processAllPromises() {
        do {
            try {
                await Promise.race(this.allValues);
                this.processFulfilledPromises();
            }
            catch (error) {
                // do nothing
            }
        }
        while (this.allValues.length > 0);
        await nextEventLoopTick();
    }

    async getReducedValue() {
        if (this.reduceCallback === null) {
            return null;
        }

        await nextEventLoopTick();
        if (this.allValues.length > 0) {
            await this.processAllPromises();
        }

        return this.currentValue;
    }
}

module.exports = LazyPromiseReducer;
