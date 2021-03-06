'use strict';

var fs    = require('fs');
var glob  = require('glob');
var async = require('async');
var path  = require('path');

module.exports = function (task) {
    task
    .id('scaffolding-file-rename')
    .name('Scaffolding: file rename.')
    .description('Replaces {{placeholders}} of file and folder names.')
    .author('Indigo United')

    .option('files', 'From which dir to start looking for files with placeholders. Accepts a dir and array of dirs. Also note that the dirs can be minimatch patterns.')
    .option('data', 'The data to be used while renaming. Keys are placeholder names and the values are the content for each placeholder.')
    .option('glob', 'The options to pass to glob (check https://npmjs.org/package/glob for details).', null)

    .do(function (opt, ctx, next) {
        var files = Array.isArray(opt.files) ? opt.files : [opt.files];

        // Do this in series, because it can give problems if the directories intersect eachother
        async.forEachSeries(files, function (file, next) {
            glob(file, opt.glob, function (err, matches) {
                if (err) {
                    return next(err);
                }

                // Grab the list of files to rename
                // Note that matches must be traversed backwards
                var x;
                var filesToRename = [];
                var before;
                var after;

                for (x = matches.length - 1; x >= 0; --x) {
                    before = path.basename(matches[x]);
                    after = ctx.string.interpolate(before, opt.data);

                    if (before !== after) {
                        filesToRename.push({ before: matches[x], after: path.dirname(matches[x]) + '/' + after });
                    }
                }

                // Foreach file found, rename it (has to be in series)
                async.forEachSeries(filesToRename, function (obj, next) {
                    ctx.log.debugln('Renaming from ' + obj.before + ' to ' + obj.after);
                    fs.rename(obj.before, obj.after, next);
                }, next);
            });
        }, next);
    });
};
