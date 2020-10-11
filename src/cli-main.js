const { setupEnv } = require('./lib/env.js')
const { startServer } = require('./cli-serve.js')
const { writeStatic } = require('./cli-build.js')
const { resolve } = require('path')
const { buildOptions } = require('./build-options.js')
const { duration } = require('./utils/perfutil.js')
const esbuild = require('esbuild')

const log = require('debug')('hostic:main')

const sitePath = resolve('site')

let service
let code
let mod

async function performUserSetup() {
  try {
    return mod.default(sitePath)
  } catch (err) {
    console.error('Exception:', err)
  }
}

async function build() {
  log('Build...')

  if (!service) {
    service = await esbuild.startService()
    log('ESBuild service', service)
  }

  // https://github.com/evanw/esbuild#command-line-usage
  const options = {
    ...buildOptions,
    entryPoints: [sitePath + '/index.js'],
    write: false,
  }
  log('Build options', options)

  let result = await service.build(options)
  code = new TextDecoder('utf-8').decode(result.outputFiles[0].contents)

  try {
    module = null
    global.basePath = sitePath
    if (code) {
      code = `(function(exports) {
        ${code}
        return exports;
      })({})`
      mod = eval(code)
      // return module.default(sitePath)
    }
  } catch (err) {
    console.error('Exception:', err)
  }

  return performUserSetup()
}

async function cliMain() {
  let time = duration()

  setupEnv()

  log('env =', process.env.BASE_URL)

  // BUILD STATIC SITE
  const STATIC = process.argv.includes('--build') || process.argv.includes('build')
  if (STATIC) {
    log('build a static site')
    if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production'
    let site = await build()
    await writeStatic({ site, time })
    process.exit()
  }

  // DYNAMIC PREVIEW SERVER
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development'
  }

  log('start server')
  startServer({
    performUserSetup,
    sitePath,
    build,
    time,
  })
}

module.exports.main = cliMain
