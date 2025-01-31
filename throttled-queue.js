"use strict";

(function() {

    // global on the server, window in the browser
    var previous_throttledQueue;

    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self ||
        typeof global === 'object' && global.global === global && global ||
        this;

    if (root != null) {
        previous_throttledQueue = root.throttledQueue;
    }

    /**
     * Factory function.
     *
     * @param maxRequestPerInterval
     * @param interval
     * @param evenlySpaced
     * @returns {Object}
     */
    var throttledQueue = function(maxRequestPerInterval, interval, evenlySpaced) {

        /**
         * If all requests should be evenly spaced, adjust to suit.
         */
        if (evenlySpaced) {
            interval = interval / maxRequestPerInterval;
            maxRequestPerInterval = 1;
        }

        if (interval < 200) {
            console.warn('An interval of less than 200ms can create performance issues.');
        }

        var queue = [];
        var lastCalled = Date.now();
        var timeout;

        /**
         * Gets called at a set interval to remove items from the queue.
         * This is a self-adjusting timer,
         * since the browser's setTimeout is highly inaccurate.
         */
        var dequeue = function(cb) {

            var threshold = lastCalled + interval;
            var now = Date.now();

            /**
             * Adjust the timer if it was called too early.
             */
            if (now < threshold) {
                clearTimeout(timeout);
                timeout = setTimeout(cb ? () => dequeue(cb) : dequeue, threshold - now);
                return;
            }

            var callbacks = queue.splice(0, maxRequestPerInterval);
            for(var x = 0; x < callbacks.length; x++) {
                callbacks[x]();
            }

            lastCalled = Date.now();
            if (queue.length) {
                timeout = setTimeout(cb ? () => dequeue(cb) : dequeue, interval);
            } else {
                timeout = null;
                cb(null)
            }
        };

        var enqueue = function(callback, cb) {

            queue.push(callback);
            if (!timeout) {
                timeout = setTimeout(cb ? () => dequeue(cb) : dequeue, interval);
            }
        };

        var asyncEnqueue = function(callback) {
            return new Promise((resolve, reject) => {
                enqueue(callback, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        };

        return {
            throttle: enqueue,
            asyncThrottle: asyncEnqueue,
        }
    };

    throttledQueue.noConflict = function () {
        root.throttledQueue = previous_throttledQueue;
        return throttledQueue;
    };

    // Node.js
    if (typeof module === 'object' && module.exports) {
        module.exports = throttledQueue;
    }
    // AMD / RequireJS
    else if (typeof define === 'function' && define.amd) {
        define([], function () {
            return throttledQueue;
        });
    }
    // included directly via <script> tag
    else {
        root.throttledQueue = throttledQueue;
    }

}).call(this);
