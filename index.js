#!/usr/bin/env node

const { argv, hrtime } = require('process')
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs')
const { join } = require('path')
const transform = require('./transform')
var request = require('sync-request')

let timer = hrtime()

const inputArgs = argv.find(x => x.startsWith('--input='))
if (!inputArgs) {
    console.error('No input path provided.')

    return 0
}

const inputPath = inputArgs.substr('--input='.length)
if (!inputPath) {
    console.error('No input path provided.')

    return 0
}

const outputArgs = argv.find(x => x.startsWith('--output='))
if (!outputArgs) {
    console.error('No output path provided.')

    return 0
}

const outputPath = outputArgs.substr('--output='.length)
if (!outputPath) {
    console.error(`Output file "${inputPath}" not .ts file.`)

    return 0
}

// TODO: move
let unparsedJson
if (inputPath.startsWith('http')) {
    try {
        unparsedJson = request('GET', inputPath).getBody()
    } catch (error) {
        console.error(`Configuration file "${inputPath}" not found.`)

        return 0
    }
} else if (inputPath.endsWith('.json')) {
    try {
        unparsedJson = readFileSync(inputPath, 'utf8')
    } catch (error) {
        console.error(`Configuration file "${inputPath}" not found.`)

        return 0
    }
} else {
    console.error(`Swagger resource "${inputPath}" has not valid path.`)

    return 0
}

// TODO: move
let jsonObject
try {
    jsonObject = JSON.parse(unparsedJson)
} catch (error) {
    console.error(`Swagger resource "${inputPath}" contains invalid JSON.`)

    return 0
}

// TODO: move
let result
try {
    result = transform(jsonObject)
} catch (error) {
    console.error(error)

    return 0
}

///////////////////

const apiEndpoint = 'http://api.litecrm.org'
// httpClientFactory.create('host').get('url', {id})
// httpClientFactory.create('host').post('url', data)

function mapClass(file) {
    return (
        `export default class ${file.name} {${NewLine}` +
        `${file.actions.map(action => mapMethod(action)).join(NewLine)}` +
        `${NewLine}}`
    )
}

function mapMethod(action) {
    return (
        `    public static ${action.name}(${action.parameters}): Promise<${action.returnType}>${NewLine}` +
        `        return createClient<${action.returnType}>('${apiEndpoint + action.path}', '${
            action.httpMethod
        }')${NewLine}${NewLine}` +
        '   }'
    )
}

const NewLine = '\n'

try {
    for (const folder of result) {
        const folderPath = join(__dirname, outputPath, folder.name)
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true })
        }

        for (const file of folder.files) {
            let content = mapClass(file)

            writeFileSync(join(folderPath, file.name + '.ts'), content)
        }
    }

    timer = hrtime(timer)
    console.log('Done in %d.%d seconds.', timer[0], timer[1])

    return 0
} catch (error) {
    timer = hrtime(timer)
    console.error(error)
    console.error('Error in %d.%d seconds.', timer[0], timer[1])

    return 0
}
