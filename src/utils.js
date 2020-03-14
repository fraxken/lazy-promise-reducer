"use strict";

function makeQuerablePromise(promise) {
    let isFulfilled = false;

    const result = promise.then(
        function ok(value) {
            isFulfilled = true;

            return value;
        },
        function error(error) {
            isFulfilled = true;
            throw error;
        }
    );

    result.isFulfilled = () => isFulfilled;

    return result;
}

module.exports = {
    makeQuerablePromise
};
