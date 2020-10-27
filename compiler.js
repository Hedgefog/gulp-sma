const path = require('path');
const child_process = require('child_process');

const mkdirp = require('mkdirp');
const colors = require('colors');

colors.setTheme({
    data: 'grey',
    debug: 'blue',
    info: 'green',
    warn: 'yellow',
    error: 'red'
});

const PluginExt = 'amxx';

const MessageRegExp = {
    filename: /([a-zA-Z0-9.\-_/:\\\s]+)/,
    line: /\(([0-9]+)(?:\s--\s([0-9]+))?\)/,
    type: /((?:fatal\s)?error|warning)/,
    code: /([0-9]+)/,
    message: /(.*)/
};

const messageRegExp = buildMessageRegExp();

function formatError(parsedLine) {
    const { filename, startLine, type, code, message} = parsedLine;

    return `${filename}(${startLine}) : ${type} ${code}: ${message}`;
}

function parseOutput(output) {
    const result = {messages: [], aborted: false, error: false};

    output.split('\n').forEach(line => {
        const message = parseLine(line);

        const {type} = message;

        if (type === 'error' || type === 'fatal error') {
            console.log(formatError(message).error);
            result.error = true;
        } else if (type === 'warning' ) {
            console.log(formatError(message).warn);
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

    const pattern = [
        filename,
        line,
        /\s:\s/,
        type,
        /\s/,
        code,
        /:\s/,
        message
    ].map(r => r.toString().slice(1, -1)).join('');

    return new RegExp(pattern);
}

function formatArgs(params, outPath) {
    const includeArgs = params.includeDir instanceof Array
        ? params.includeDir.map((dir) => `-i${dir}`)
        : [`-i${params.includeDir}`];

    return [
        `${params.path}`,
        `-o${outPath}`,
        ...includeArgs
    ];
}

module.exports = (params) => {
    const parsedPath = path.parse(params.path);
    const fileName = `${parsedPath.name}.${PluginExt}`;
    const dest = path.join(params.dest, fileName);

    mkdirp.sync(params.dest);

    return new Promise((resolve, reject) => {
        let output = '';

        console.log(`Building plugin '${params.path}'...`.debug);

        const compilerProcess = child_process.spawn(
            params.compiler,
            formatArgs(params, dest),
            {
                env: process.env,
                cwd: path.parse(params.compiler).dir
            }
        );

        compilerProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        compilerProcess.stderr.on('data', (data) => console.error(data));

        compilerProcess.on('error', (err) => {
            const parsedOutput = parseOutput(output);
            console.log(`Failed to compile plugin ${fileName}.`.error);

            reject(Object.assign(
                {plugin: fileName, error: err},
                parsedOutput
            ));
        });

        compilerProcess.on('close', () => {
            const parsedOutput = parseOutput(output);
            if (parsedOutput.error) {
                console.log(`Failed to compile plugin ${fileName}.`.error);

                reject(Object.assign(
                    {plugin: fileName},
                    parsedOutput
                ));
            } else {
                console.log(`Plugin ${fileName} updated.`.info);

                resolve(Object.assign(
                    {plugin: fileName},
                    parsedOutput
                ));
            }
        });
    });
};
