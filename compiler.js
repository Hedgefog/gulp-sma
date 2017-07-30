const path = require('path');
const child_process = require('child_process');

const colors = require('colors');

const {makePath} = require('./utils');

colors.setTheme({
    data: 'grey',
    debug: 'blue',
    info: 'green',
    warn: 'yellow',
    error: 'red'
});

const PluginExt = 'amxx';

const MessageRegExp = {
    filename: '([a-zA-Z0-9.-_\\/\\s]+)',
    line: '\\(([0-9]+)(?:\\-([0-9]+))?\\)',
    type: '((?:fatal\\s)?error|warning)',
    code: '([0-9]+)',
    message: '(.*)'
};

const messageRegExp = buildMessageRegExp();

function parseOutput(output) {
    const result = {messages: [], aborted: false};

    output.split('\n').forEach(line => {
        const message = parseLine(line);

        const {type} = message;

        if (type === 'error' || type === 'fatal error') {
            console.log(line.error);
        } else if (type === 'warning' ) {
            console.log(line.warn);
        } else if (type === 'echo') {
            if (line.startsWith('Compilation aborted.')
                || line.startsWith('Could not locate output file')) {
                result.aborted = true;
            }
        }

        result.messages.push(message);
    });

    return result;
}

function parseLine(line) {
    const match = line.match(messageRegExp);

    if (!match) {
        return {type: 'echo', message: line};
    }

    const [, filename, startLine, endLine, type, code, message] = match;

    return {
        filename,
        startLine: +startLine,
        endLine: endLine ? +endLine : -1,
        type,
        code: +code,
        message
    };
}

function buildMessageRegExp() {
    const {filename, line, type, code, message} = MessageRegExp;

    const pattern = `${filename}${line}\\s\\:\\s${type}\\s${code}\\:\\s${message}`;
    return new RegExp(pattern);
}

function formatArgs(params, outPath) {
    return [
        `"-o${outPath}"`,
        `"-i${params.includeDir}"`,
        `"${params.path}"`
    ];
}

module.exports = (params) => {
    const parsedPath = path.parse(params.path);
    const fileName = `${parsedPath.name}.${PluginExt}`;
    const dest = path.join(params.dest, fileName);

    makePath(dest);

    const args = formatArgs(params, dest);
    const cmd = [`${params.compiler}`, ...args].join(' ');

    return new Promise((resolve, reject) => {
        console.log(`Building plugin '${params.path}'...`.debug);

        child_process.exec(cmd, (err, stdout) => {
            if (err) {
                throw err;
            }

            const result = Object.assign(
                {plugin: fileName},
                parseOutput(stdout)
            );

            if (!result.aborted) {
                resolve(result);
                console.log(`Plugin ${fileName} updated.`.info);
            } else {
                console.log(`Failed to compile plugin ${fileName}.`.error)
                reject(result);
            }
        });
    });
};
