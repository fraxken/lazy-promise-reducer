# Lazy-promise-reducer
Lazy reduce an Asynchronous Stream of Promise. This module may help to enhance memory usage when there is a need to deal with a high amount of Promises.

## Requirements
- [Node.js](https://nodejs.org/en/) v12 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @slimio/lazy-promise-reducer
# or
$ yarn add @slimio/lazy-promise-reducer
```

## Usage example
```js
"use strict";

const { stat, readdir } = require("fs").promises;
const { extname, join } = require("path");

const LazyPromiseReducer = require("lazy-promise-reducer");

async function* fetchFiles(directoryLocation) {
    const dirents = await readdir(directoryLocation, { withFileTypes: true });

    for (const dirent of dirents) {
        const fullDirentPath = join(directoryLocation, dirent.name);
        yield fullDirentPath;

        if (dirent.isDirectory()) yield* fetchFiles(fullDirentPath);
    }
}

async function getDirectorySize(dir) {
    const root = await stat(dir);
    if (!root.isDirectory()) throw new Error("dir must be a directory!");

    const asyncFileSizeReducer = await (new LazyPromiseReducer(stat)
        .reduce((prev, curr) => prev + curr.size, root.size))
        .fromAsyncIterable(fetchFiles(dir))

    return asyncFileSizeReducer.getReducedValue();
}
```

## API
TBC

## License
MIT
