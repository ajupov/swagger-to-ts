const GetMethod = 'GET'
const PostMethod = 'POST'
const PutMethod = 'PUT'
const PatchMethod = 'PATCH'
const DeleteMethod = 'DELETE'
const SuccessStatusCode = '200'
const ApplicationJsonContentType = 'application/json'
const ReferenceObject = '$ref'

// Only Content-Type: application/json
// Only HTTP Methods: GET, POST
// Not support Mixed-Types
// Not support more of 2 dimension arrays in return type
// Not support object without $ref return type

function getActionName(path) {
    return path.split('/').slice(-1)[0] + 'Async'
}

function getFolderName(path) {
    return path.split('/').filter(x => x)[0]
}

function getFolder(folders, folderName) {
    let folder = folders.find(x => x.name === folderName)
    if (!folder) {
        folder = {
            name: folderName,
            files: []
        }
        folders.push(folder)
    }

    return folder
}

function getFileName(methodInfo) {
    return methodInfo.tags[0] + 'Client'
}

function getFile(folder, fileName) {
    let file = folder.files.find(x => x.name === fileName)
    if (!file) {
        file = {
            name: fileName,
            actions: []
        }
        folder.files.push(file)
    }

    return file
}

function getReturnType(method, pathInfo) {
    const content = pathInfo[method].responses[SuccessStatusCode].content
    if (content) {
        const schema = content[ApplicationJsonContentType].schema
        if (schema) {
            return getType(schema)
        }
    }

    return ''
}

function getParameters(method, pathInfo) {
    let parameters = []

    switch (method.toUpperCase()) {
        case GetMethod:
            if (!pathInfo[method].parameters) {
                break
            }

            for (const pathInfoParameter of pathInfo[method].parameters) {
                const parameter = {
                    name: pathInfoParameter.name,
                    required: pathInfoParameter.required,
                    type: pathInfoParameter.schema.type
                }
                parameters.push(parameter)
            }
            break
        case PostMethod:
        case PutMethod:
        case PatchMethod:
        case DeleteMethod:
            const schema = pathInfo[method].requestBody.content[ApplicationJsonContentType].schema
            const type = getType(schema)
            const parameter = {
                name: type,
                required: true,
                type: type
            }
            parameters.push(parameter)
            break
    }

    return parameters
}

function getType(schema) {
    const objectPath = schema[ReferenceObject]
    if (objectPath) {
        return objectPath.split('/').slice(-1)[0]
    }

    switch (schema.type) {
        case 'string':
            return 'string'

        case 'integer':
            return 'number'

        case 'boolean':
            return 'boolean'

        case 'object':
            const additionalProperties = schema.additionalProperties
            if (additionalProperties) {
                if (additionalProperties[ReferenceObject]) {
                    return additionalProperties[ReferenceObject].split('/').slice(-1)[0] + '[]'
                } else {
                    console.error()

                    debugger
                }
            } else {
                console.error()

                debugger
            }

        case 'array':
            if (schema.items[ReferenceObject]) {
                return schema.items[ReferenceObject].split('/').slice(-1)[0] + '[]'
            } else {
                return getType(schema.items) + '[]'
            }
    }
}

function transform(json) {
    let folders = []

    for (const [path, pathInfo] of Object.entries(json.paths)) {
        const actionName = getActionName(path)
        const folderName = getFolderName(path)
        const folder = getFolder(folders, folderName)

        for (const [method, methodInfo] of Object.entries(pathInfo)) {
            const fileName = getFileName(methodInfo)
            const file = getFile(folder, fileName)
            const returnType = getReturnType(method, pathInfo)
            const parameters = getParameters(method, pathInfo)

            const actionInfo = {
                name: actionName,
                returnType: returnType,
                parameters: parameters,
                httpMethod: method.toUpperCase(),
                path: path
            }

            file.actions.push(actionInfo)
        }
    }

    return folders
}

module.exports = transform
