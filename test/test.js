/*global describe, it, beforeEach, after*/

'use strict';

var fs        = require('fs');
var expect    = require('expect.js');
var rimraf    = require('rimraf');
var fstream   = require('fstream');
var isFile    = require('./util/isFile');
var isDir     = require('./util/isDir');
var rename    = require('../autofile');
var automaton = require('automaton').create();

describe('scaffolding-close', function () {
    function clean(done) {
        rimraf(__dirname + '/tmp', done);
    }

    beforeEach(function (done) {
        clean(function (err) {
            if (err) {
                throw err;
            }

            fs.mkdirSync(__dirname + '/tmp');
            fs.mkdirSync(__dirname + '/tmp/file-rename');

            // Create some assets in tmp/file-rename
            fs.writeFileSync(__dirname + '/tmp/file-rename/file1_{{placeholder1}}_{{placeholder2}}.json', '');
            fs.mkdirSync(__dirname + '/tmp/file-rename/dummy{{empty}}');
            fs.writeFileSync(__dirname + '/tmp/file-rename/dummy{{empty}}/file1_{{placeholder1}}_{{placeholder2}}.json', '');


            done();
        });
    });
    after(clean);

    it('should replace filename placeholders with string', function (done) {
        // Copy file-rename to file-rename-copy to test multiple dirs
        var reader = fstream.Reader(__dirname + '/tmp/file-rename').pipe(
            fstream.Writer({
                type: 'Directory',
                path: __dirname + '/tmp/file-rename-copy'
            })
        );

        reader.on('error', function (err) {
            throw err;
        });

        reader.on('end', function () {
            automaton.run({
                setup: function (opts, ctx, next) {
                    opts.__dirname = __dirname;
                    next();
                },
                tasks: [
                    {
                        task: rename,
                        options: {
                            files: ['{{__dirname}}/tmp/file-rename/**/*', '{{__dirname}}/tmp/file-rename-copy/**/*'],
                            data: {
                                placeholder1: 'foo',
                                placeholder2: 'bar',
                                empty: ''
                            }
                        }
                    }
                ]
            }, null, function (err) {
                if (err) {
                    throw err;
                }

                expect(isFile(__dirname + '/tmp/file-rename/file1_foo_bar.json')).to.equal(true);
                expect(isDir(__dirname + '/tmp/file-rename/dummy')).to.equal(true);
                expect(isFile(__dirname + '/tmp/file-rename/dummy/file1_foo_bar.json')).to.equal(true);
                expect(isFile(__dirname + '/tmp/file-rename-copy/file1_foo_bar.json')).to.equal(true);
                expect(isFile(__dirname + '/tmp/file-rename-copy/dummy/file1_foo_bar.json')).to.equal(true);

                done();
            });
        });
    });

    it('should accept minimatch patterns', function (done) {
        automaton.run({
            setup: function (opts, ctx, next) {
                opts.__dirname = __dirname;
                next();
            },
            tasks: [
                {
                    task: rename,
                    options: {
                        files: ['{{__dirname}}/tmp/file*rename/**/*'],
                        data: {
                            placeholder1: 'foo',
                            placeholder2: 'bar',
                            empty: ''
                        }
                    }
                }
            ]
        }, null, function (err) {
            if (err) {
                throw err;
            }

            expect(isFile(__dirname + '/tmp/file-rename/file1_foo_bar.json')).to.equal(true);
            expect(isDir(__dirname + '/tmp/file-rename/dummy')).to.equal(true);
            expect(isFile(__dirname + '/tmp/file-rename/dummy/file1_foo_bar.json')).to.equal(true);

            done();
        });
    });

    it('should pass over the glob options', function (done) {
        // Rename to .file-rename and tell glob to match files starting with dot
        fs.renameSync(__dirname + '/tmp/file-rename', __dirname + '/tmp/.file-rename');

        automaton.run({
            setup: function (opts, ctx, next) {
                opts.__dirname = __dirname;
                next();
            },
            tasks: [
                {
                    task: rename,
                    options: {
                        files: ['{{__dirname}}/tmp/*file-rename/**/*'],
                        data: {
                            placeholder1: 'foo',
                            placeholder2: 'bar',
                            empty: ''
                        },
                        glob: {
                            dot: true
                        }
                    }
                }
            ]
        }, null, function (err) {
            if (err) {
                throw err;
            }

            expect(isFile(__dirname + '/tmp/.file-rename/file1_{{placeholder1}}_{{placeholder2}}.json')).to.equal(false);
            expect(isDir(__dirname + '/tmp/.file-rename/dummy')).to.equal(true);
            expect(isFile(__dirname + '/tmp/.file-rename/dummy/file1_{{placeholder1}}_{{placeholder2}}.json')).to.equal(false);

            done();
        });
    });
});
