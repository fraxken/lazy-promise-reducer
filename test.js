"use strict";

const { opendir, stat } = require("fs").promises;
const { extname, join } = require("path");
const LazyPromiseReducer = require("./");

async function* fetchFiles(directoryLocation, bufferSize = 16) {
    const dirents = await opendir(directoryLocation, { bufferSize });

    for await (const dirent of dirents) {
        const fullDirentPath = join(directoryLocation, dirent.name);
        const isDirectory = dirent.isDirectory();
        yield [isDirectory, fullDirentPath];

        if (isDirectory) {
            yield* fetchFiles(fullDirentPath, bufferSize);
        }
    }
}

async function getSizeAndExtensions(dir) {
    const extensions = new Set();
    const root = await stat(dir);
    if (!root.isDirectory()) {
        throw new Error("dir must be a directory!");
    }

    const asyncFileSizeReducer = new LazyPromiseReducer(([, path]) => stat(path))
        .reduce((prev, curr) => prev + curr.size, root.size);

    for await (const [isDirectory, filePath] of fetchFiles(dir)) {
        if (!isDirectory) {
            extensions.add(extname(filePath));
        }
        asyncFileSizeReducer.push(filePath);
    }

    const size = await asyncFileSizeReducer.getReducedValue();

    return { extensions, size };
}

async function main() {
    console.time("exec");
    const { extensions, size } = await getSizeAndExtensions(process.cwd());
    console.timeEnd("exec");
    console.log([...extensions]);
    console.log(`directory size: ${size}`);
}
main().catch(console.error);

