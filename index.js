#!/usr/bin/env node

import { argv, hrtime } from 'process'
import { readFileSync, writeFileSync } from 'fs'

import transform from './transform'

let timer = hrtime()

const inputArgs = argv.find(x => x.startsWith('--input='))
if (!inputArgs) {
    return console.error('No input path provided.')
}

const inputPath = inputArgs.substr('--input='.length)
if (!inputPath.endsWith('.json')) {
    return console.error(`Input file "${inputPath}" not json file.`)
}

const outputArgs = argv.find(x => x.startsWith('--output='))
if (!outputArgs) {
    return console.error('No output path provided.')
}

const outputPath = outputArgs.substr('--input='.length)
if (!outputPath.endsWith('.ts')) {
    return console.error(`Output file "${inputPath}" not .ts file.`)
}

// TODO: move
let unparsedJson
if (inputPath.endsWith('.json')) {
    try {
        unparsedJson = readFileSync(inputPath, 'utf8')
    } catch (error) {
        return console.error(`Configuration file "${inputPath}" not found.`)
    }
} else if (inputPath.startsWith('http')) {
    try {
        unparsedJson = httpclient.getAsString(inputPath)
    } catch (error) {
        return console.error(`Configuration file "${inputPath}" not found.`)
    }
} else {
    return console.error(`Swagger resource "${inputPath}" has not valid path.`)
}

// TODO: move
let jsonObject
try {
    jsonObject = JSON.parse(unparsedJson)
} catch (error) {
    return console.error(`Swagger resource "${inputPath}" contains invalid JSON.`)
}

// TODO: move
let result
try {
    result = transform(jsonObject)
} catch (error) {
    return console.error(error)
}

try {
    writeFileSync(config.output, result)

    timer = hrtime(timer)
    console.log('Done in %d.%d seconds.', timer[0], timer[1])
} catch (error) {
    timer = hrtime(timer)
    console.error('Error in %d.%d seconds.', timer[0], timer[1])
}
