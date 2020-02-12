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

function getIHttpClientFactoryContent() {
    return (
        'export interface IHttpClient {\n' +
        '    get: <Result>(url: string, data?: any, headers?: HeadersInit) => Promise<Result>\n' +
        '    post: <Result>(url: string, data?: any, headers?: HeadersInit) => Promise<Result>\n' +
        '}\n' +
        '\n' +
        'export default interface IHttpClientFactory {\n' +
        '    readonly host: string\n' +
        '    setNewAccessToken?(accessToken: string): void\n' +
        '    createClient(host: string): IHttpClient\n' +
        '}'
    )
}

function generateClassContent(file) {
    return (
        `import IHttpClientFactory from '../../IHttpClientFactory'` +
        `${generateImportsContent(file.imports)}\n` +
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

function generateImportsContent(imports) {
    const content = imports.map(_import => generateImportContent(_import)).join('\n')

    return content ? `\n${content}` : ''
}

function generateImportContent(_import) {
    return `import ${_import} from '../models/${_import}'`
}

function generateMethodsContent(actions) {
    return actions.map(action => generateMethodContent(action)).join('\n')
}

function generateMethodContent(action) {
    const parametersContent = generateMethodParameters(action.parameters)
    const returnTypeContent = generateMethodReturnType(action.returnType)

    const url = generateHttpUrl(action.path)
    const httpMethod = generateHttpMethod(action.httpMethod)
    const httpMethodReturnType = generateHttpMethodReturnType(action.returnType)
    const httpMethodParameters = generateHttpMethodParameters(action.parameters)

    return (
        `\n` +
        `    // prettier-ignore\n` +
        `    public ${action.name} = (${parametersContent}): ${returnTypeContent} =>\n` +
        `        this.httpClientFactory\n` +
        `            .createClient(this.httpClientFactory.host)\n` +
        `            .${httpMethod}${httpMethodReturnType}(${url}${httpMethodParameters})\n`
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

    return `${parametersString}`
}

function generateMethodParameter(parameter) {
    const required = parameter.required ? '' : '?'

    return `${parameter.name}${required}: ${parameter.type}`
}

function generateMethodReturnType(returnType) {
    return returnType.type ? `Promise<${returnType.type}>` : 'Promise<void>'
}

function generateHttpUrl(path) {
    return `'${path}'`
}

function generateHttpMethod(httpMethod) {
    return httpMethod.toLowerCase()
}

function generateHttpMethodReturnType(returnType) {
    return returnType.type ? `<${returnType.type}>` : ''
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

function generateHttpMethodParameter(parameter) {
    switch (parameter.type) {
        case 'boolean':
        case 'number':
        case 'string':
            return `${parameter.name}`

        default:
            return parameter.name
    }
}

try {
    // Generate 'api' folder
    if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true })
    }

    const iHttpClientFactoryContent = getIHttpClientFactoryContent()
    writeFileSync(join(outputPath, 'IHttpClientFactory.ts'), iHttpClientFactoryContent)

    for (const folder of result) {
        // products
        const folderPath = join(outputPath, folder.name.toLowerCase())

        // products/clients
        const clientsFolderPath = join(folderPath, 'clients')
        if (!existsSync(clientsFolderPath)) {
            mkdirSync(clientsFolderPath, { recursive: true })
        }

        // products/models
        const modelsFolderPath = join(folderPath, 'models')
        if (!existsSync(modelsFolderPath)) {
            mkdirSync(modelsFolderPath, { recursive: true })
        }

        for (const file of folder.clientFiles) {
            // ProductsClient.ts
            const filePath = join(clientsFolderPath, file.name + '.ts')
            const fileContent = generateClassContent(file)

            writeFileSync(filePath, fileContent)
        }
    }

    timer = hrtime(timer)
    console.log('Done in %d.%d seconds.', timer[0], timer[1])
} catch (error) {
    timer = hrtime(timer)
    console.error(error)
    console.error('Error in %d.%d seconds.', timer[0], timer[1])
}
