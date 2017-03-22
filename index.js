var join = require('path').join;
var Linter = require('tslint').Linter;
var loadConfigurationFromPath = require('tslint/lib/configuration').loadConfigurationFromPath;
var fs = require('fs')
var expand = require('glob-expand');
var Mocha = require('mocha');

var defaultSrcPatterns = ['src/*.ts', 'src/**/*.ts', '!src/*.test.ts', '!src/**/*.test.ts']
var defaultTestPatterns = ['src/*.test.ts', 'src/**/*.test.ts']
var defaultRequires = ['custom-typings/*.ts']

exports.watch = function (rootPath, srcPatterns, testPatterns, requires) {
  srcPatterns = srcPatterns || defaultSrcPatterns
  testPatterns = testPatterns || defaultTestPatterns
  requires = requires || defaultRequires

  function findFiles(patterns, filter = 'isFile') {
    return expand({ filter, cwd: rootPath }, patterns).map(file => join(rootPath, file))
  }

  require('ts-node/register')
  // load all custom typings files
  findFiles(requires).forEach(require);

  var rootPath = join(__dirname, '..')

  var tslintConfig = loadConfigurationFromPath(join(rootPath, 'tslint.json'));

  var srcDirectories = findFiles(['**/*'], 'isDirectory').concat(srcPath)
  var srcFiles = findFiles(srcPatterns)
  var testFiles = findFiles(testPatterns)

  // cleans up files to allow re-running of tests
  function destroyCache() {
    testFiles.forEach(file => {
      delete require.cache[file];
    })
  }

  function runTest(f, msg, file) {
    clearConsole()
    var mocha = new Mocha()

    if (!file) { // add all files if not provided
      console.log(msg)

      return testFiles
        .reduce((m, file) => m.addFile(file), mocha.reporter('dot'))
        .run(function () {
          destroyCache()
          f()
        })
    }

    console.log(`Running test file: ${replace(file)}...`)

    return mocha.addFile(file).run(function () {
      destroyCache()
      f()
    })
  }

  function lint(files) {
    if (files.length === 1) {
      console.log(`Linting ${replace(files[0])}...`)
    } else {
      console.log('Linting files...')
    }

    var linter = new Linter({ fix: true });

    files.forEach(file => {
      linter.lint(file, fs.readFileSync(file).toString(), tslintConfig)
    })

    var result = linter.getResult()

    if (result.failureCount > 0) {
      process.stderr.write(result.output);
    } else if (result.output) {
      process.stdout.write(result.output);
    } else {
      if (files.length === 1) {
        console.log(`Linting ${replace(files[0])} was successful`)
      } else {
        console.log(`Linting was successful`)
      }
    }
  }

  runTest(function () {
    lint(srcFiles.concat(testFiles))

    console.log('\nWaiting for changes...')

    srcDirectories.forEach(watchDirectory)
  }, `Running tests...`)

  function watchDirectory(dir) {
    var id

    fs.watch(dir, function (_, filename) {
      clearTimeout(id) // most file changes result in 2 updates, ensures only 1 execution

      var file = join(dir, filename)
      var testFile = getTestFile(file)

      var msg = testFile
        ? `Running test file: ${replace(file)} ...`
        : `No associated test for file ${replace(file)}, to be safe, re-running all tests...`

      id = setTimeout(function () {
        runTest(function () {
          lint([file])
        }, msg, testFile)
      }, 100)
    })
  }

  function replace(file) {
    return file.replace(rootPath + '/', '')
  }

  function clearConsole() {
    console.log('\x1Bc')
  }

  function getTestFile(file) {
    return testFiles.indexOf(file) > -1
      ? file
      : testFiles.indexOf(file.replace('.ts', '.test.ts')) > -1
        ? file.replace('.ts', '.test.ts')
        : null
  }
}


