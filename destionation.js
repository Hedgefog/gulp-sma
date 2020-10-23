const path = require('path');
const {Transform} = require('stream');

const gutil = require('gulp-util');

const smaCompiler = require('./compiler');

const PLUGIN_NAME = 'gulp-sma';

module.exports = function({
    ignoreSubDirs = true,
    compiler,
    includeDir,
    dest,
    ignoreError = false
}) {
    const stream = new Transform({objectMode: true});

    stream._transform = (file, encoding, cb) => {
        if (file.isNull()) {
            return cb(null, file);
        }

        if (file.isStream()) {
            cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
        }

        smaCompiler({
            compiler,
            includeDir,
            path: file.path,
            dest: ignoreSubDirs ? dest : path.join(
                dest,
                path.parse(file.relative).dir
            )
        })
            .then(() => cb(null, file))
            .catch((err) => cb(ignoreError ? null : err, file));
    };

    return stream;
};
