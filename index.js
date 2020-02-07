#!/usr/bin/env node

const { argv, hrtime } = require('process')
const { readFileSync, writeFileSync } = require('fs')
const transform = require('./transform')

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

if (!inputPath.endsWith('.json')) {
    console.error(`Input file "${inputPath}" not json file.`)

    return 0
}

const outputArgs = argv.find(x => x.startsWith('--output='))
if (!outputArgs) {
    console.error('No output path provided.')

    return 0
}

const outputPath = outputArgs.substr('--output='.length)
if (!outputPath.endsWith('.ts')) {
    console.error(`Output file "${inputPath}" not .ts file.`)

    return 0
}

// TODO: move
let unparsedJson
if (inputPath.endsWith('.json')) {
    try {
        unparsedJson = readFileSync(inputPath, 'utf8')
    } catch (error) {
        console.error(`Configuration file "${inputPath}" not found.`)

        return 0
    }
} else if (inputPath.startsWith('http')) {
    try {
        unparsedJson = httpclient.getAsString(inputPath)
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

try {
    writeFileSync(outputPath, JSON.stringify(result))

    timer = hrtime(timer)
    console.log('Done in %d.%d seconds.', timer[0], timer[1])

    return 0
} catch (error) {
    timer = hrtime(timer)
    console.error('Error in %d.%d seconds.', timer[0], timer[1])

    return 0
}
