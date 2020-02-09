const { argv, hrtime } = require('process')
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs')
const { join } = require('path')
const transform = require('./transform')
var request = require('sync-request')

let timer = hrtime()

function getInputPath() {
    const inputArgs = argv.find(x => x.startsWith('--input='))
    if (!inputArgs) {
        throw 'No input path provided.'
    }

    const inputPath = inputArgs.substr('--input='.length)
    if (!inputPath) {
        throw 'No input path provided.'
    }

    return inputPath
}

function getOutputPath() {
    const outputArgs = argv.find(x => x.startsWith('--output='))
    if (!outputArgs) {
        throw 'No output path provided.'
    }

    const outputPath = outputArgs.substr('--output='.length)
    if (!outputPath) {
        throw 'No output path provided.'
    }

    return join(__dirname, outputPath)
}

function getJson(inputPath) {
    if (inputPath.startsWith('http')) {
        try {
            return request('GET', inputPath).getBody()
        } catch (error) {
            throw `Swagger json file "${inputPath}" not found.`
        }
    } else if (inputPath.endsWith('.json')) {
        try {
            return readFileSync(inputPath, 'utf8')
        } catch (error) {
            throw `Swagger json file "${inputPath}" not found.`
        }
    }

    throw `Swagger json file "${inputPath}" has not valid path.`
}

function parseJson(json) {
    try {
        return JSON.parse(json)
    } catch (error) {
        throw `Swagger resource "${inputPath}" contains invalid JSON.`
    }
}

const inputPath = getInputPath()
const outputPath = getOutputPath()
const json = getJson(inputPath)
const jsonObject = parseJson(json)
const result = transform(jsonObject)

function generateClassContent(file) {
    return (
        `import IHttpClientFactory from '../../IHttpClientFactory'\n` +
        `\n` +
        `export default class ${file.name} {\n` +
        `    private readonly httpClientFactory: IHttpClientFactory\n` +
        `\n` +
        `    constructor(httpClientFactory: IHttpClientFactory) {\n` +
        `        this.httpClientFactory = httpClientFactory\n` +
        `    }\n` +
        `${generateMethodsContent(file.actions)}` +
        `}`
    )
}

function generateMethodsContent(actions) {
    return actions.map(action => generateMethodContent(action)).join('\n')
}

function generateMethodContent(action) {
    const parametersContent = generateMethodParameters(action.parameters)
    const returnTypeContent = generateMethodReturnType(action.returnType)

    const url = action.path
    const httpMethod = generateHttpMethod(action.httpMethod)
    const httpMethodReturnType = generateHttpMethodReturnType(action.returnType)
    const httpMethodParameters = generateHttpMethodParameters(action.parameters)

    return (
        `\n` +
        `    // prettier-ignore` +
        `    public ${action.name} = (${parametersContent}): ${returnTypeContent} =>\n` +
        `        this.httpClientFactory` +
        `            .createClient(this.httpClientFactory.host)` +
        `            .${httpMethod}${httpMethodReturnType}(${url}${httpMethodParameters})` +
        '    }'
    )
}

function generateMethodParameters(parameters) {
    if (!parameters || parameters.length === 0) {
        return ''
    }

    if (parameters.length === 1) {
        return generateMethodParameter(parameters[0])
    }

    const parametersString = parameters.map(parameter => generateMethodParameter(parameter)).join(', ')

    return `{ ${parametersString} }`
}

function generateMethodParameter(parameter) {
    const required = parameter.required ? '?' : ''

    return `${parameter.name}${required}: ${parameter.type}`
}

function generateMethodReturnType(returnType) {
    return returnType ? `Promise<${action.returnType}>` : 'Promise'
}

function generateHttpMethod(httpMethod) {
    return httpMethod.toLowerCase()
}

function generateHttpMethodReturnType(returnType) {
    return returnType ? `<${returnType}>` : ''
}

function generateHttpMethodParameters(parameters) {
    if (!parameters || parameters.length === 0) {
        return ''
    }

    if (parameters.length === 1) {
        return `, ${generateHttpMethodParameter(parameters[0])}`
    }

    const parametersString = parameters.map(parameter => generateHttpMethodParameter(parameter)).join(', ')

    return `, { ${parametersString} }`
}

function generateHttpMethodParameter() {
    switch (parameters[0].type) {
        case 'boolean':
        case 'number':
        case 'string':
            return `{ ${parameters[0].name} }`

        default:
            return parameters[0].name
    }
}

try {
    // Generate 'api' folder
    if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true })
    }

    for (const folder of result) {
        const folderPath = join(outputPath, folder.name)

        // Generate 'activities/clients' folder
        const clientsFolderPath = join(folderPath, 'clients')
        if (!existsSync(clientsFolderPath)) {
            mkdirSync(folderPath, { recursive: true })
        }

        // Generate 'activities/models' folder
        const modelsFolderPath = join(folderPath, 'models')
        if (!existsSync(modelsFolderPath)) {
            mkdirSync(folderPath, { recursive: true })
        }

        for (const file of folder.files) {
            // Generate ActivitiesClient.ts
            const filePath = join(clientsFolderPath, file.name + '.ts')
            const fileContent = generateClassContent(file)

            writeFileSync(filePath, fileContent)
        }
    }

    timer = hrtime(timer)
    console.log('Done in %d.%d seconds.', timer[0], timer[1])
} catch (error) {
    timer = hrtime(timer)

    console.error('Error in %d.%d seconds.', timer[0], timer[1])
}
