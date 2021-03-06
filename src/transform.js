const GetMethod = 'GET'
const PostMethod = 'POST'
const PutMethod = 'PUT'
const PatchMethod = 'PATCH'
const DeleteMethod = 'DELETE'
const SuccessStatusCode = '200'
const CreatedStatusCode = '204'
const ApplicationJsonContentType = 'application/json'
const ReferenceObject = '$ref'

// Only Content-Type: application/json
// Only HTTP Methods: GET, POST
// Not support Mixed-Types
// Not support object without $ref return type

function isModelType(type) {
    return type !== 'string' && type !== 'number' && type !== 'boolean' && type !== 'object'
}

////////////////////////////////////////////////
function getActionName(path) {
    return path.split('/').slice(-1)[0] + 'Async'
}

function getFolderName(path) {
    return path.split('/').filter(x => x)[0]
}

function getFileName(methodInfo) {
    return methodInfo.tags[0] + 'Client'
}

/////////////////////////////////////////////////

function getFolder(folders, folderName) {
    let folder = folders.find(x => x.name === folderName)
    if (!folder) {
        folder = {
            name: folderName,
            clientFiles: [],
            modelFiles: []
        }

        folders.push(folder)
    }

    return folder
}

function getClientFile(folder, fileName) {
    let file = folder.clientFiles.find(x => x.name === fileName)
    if (!file) {
        file = {
            name: fileName,
            actions: [],
            imports: []
        }

        folder.clientFiles.push(file)
    }

    return file
}

/////////////////////////////////////////////////

function getReturnType(method, pathInfo) {
    if (pathInfo[method].responses[CreatedStatusCode]) {
        return { type: undefined, importType: undefined }
    }

    const response = pathInfo[method].responses[SuccessStatusCode]
    const schema = response.content ? response.content[ApplicationJsonContentType].schema : response.schema
    if (schema) {
        return getTypeBySchema(schema)
    }

    return { type: undefined, importType: undefined }
}

function getParameters(method, pathInfo) {
    switch (method.toUpperCase()) {
        case GetMethod:
            if (!pathInfo[method].parameters) {
                return []
            }

            let parameters = []

            for (const pathInfoParameter of pathInfo[method].parameters) {
                if (pathInfoParameter.schema) {
                    const type = getTypeBySchema(pathInfoParameter.schema)

                    const parameter = {
                        name: pathInfoParameter.name,
                        required: pathInfoParameter.required,
                        type: type.type,
                        importType: type.importType
                    }

                    parameters.push(parameter)
                } else {
                    const type = getType(pathInfoParameter.type)

                    const parameter = {
                        name: pathInfoParameter.name,
                        required: pathInfoParameter.required,
                        type: type.type,
                        importType: type.importType
                    }

                    parameters.push(parameter)
                }
            }

            return parameters
        case PostMethod:
        case PutMethod:
        case PatchMethod:
        case DeleteMethod:
            if (pathInfo[method].parameters && pathInfo[method].parameters.length > 0) {
                let parameters = []

                for (const pathInfoParameter of pathInfo[method].parameters) {
                    if (pathInfoParameter.schema) {
                        const type = getTypeBySchema(pathInfoParameter.schema)

                        const parameter = {
                            name: pathInfoParameter.name,
                            required: pathInfoParameter.required,
                            type: type.type,
                            importType: type.importType
                        }

                        parameters.push(parameter)
                    } else {
                        const type = getType(pathInfoParameter.type)

                        const parameter = {
                            name: pathInfoParameter.name,
                            required: pathInfoParameter.required,
                            type: type.type,
                            importType: type.importType
                        }

                        parameters.push(parameter)
                    }
                }

                return parameters
            }

            const content =
                pathInfo[method].requestBody && pathInfo[method].requestBody.content[ApplicationJsonContentType]

            if (!content) {
                return []
            }

            if (content.schema) {
                const type = getTypeBySchema(content.schema)

                let name = ''

                if (!content.name) {
                    switch (type.type) {
                        case 'boolean[]':
                        case 'number[]':
                        case 'string[]':
                            name = 'values'
                            break
                        default:
                            name = type.type
                                .split(/(?=[A-Z])/)
                                .slice(-1)[0]
                                .toLowerCase()
                            break
                    }
                } else {
                    name = content.name
                }

                const parameter = {
                    name: name,
                    required: content.required,
                    type: type.type,
                    importType: type.importType
                }

                return [parameter]
            } else {
                const type = getType(pathInfoParameter.type)

                const parameter = {
                    name: content.name,
                    required: content.required,
                    type: type.type,
                    importType: type.importType
                }

                return [parameter]
            }

        default:
            return []
    }
}

function getType(type) {
    switch (type) {
        case 'boolean':
            return { type: 'boolean', importType: undefined }

        case 'integer':
        case 'number':
            return { type: 'number', importType: undefined }

        case 'string':
            return { type: 'string', importType: undefined }

        case 'object':
            return { type: 'object', importType: undefined }

        default:
            return undefined
    }
}

function getTypeByRef(typeWithRef) {
    const objectPath = typeWithRef[ReferenceObject]
    if (objectPath) {
        const type = objectPath.split('/').slice(-1)[0]

        return { type: type, importType: type }
    }

    return undefined
}

function getTypeFromArray(schema) {
    if (schema.type === 'array') {
        if (schema.items[ReferenceObject]) {
            const type = schema.items[ReferenceObject].split('/').slice(-1)[0]

            return { type: type + '[]', importType: type }
        } else {
            const type = getTypeBySchema(schema.items)

            return { type: type.type + '[]', importType: type.importType }
        }
    }

    return undefined
}

function getTypeFromObject(schema) {
    if (schema.type === 'object') {
        const additionalProperties = schema.additionalProperties
        if (additionalProperties) {
            if (additionalProperties[ReferenceObject]) {
                const type = additionalProperties[ReferenceObject].split('/').slice(-1)[0]

                return { type: type + '[]', importType: type }
            } else {
                return { type: additionalProperties.type + '[]', importType: undefined }
            }
        }
    }

    return undefined
}

function getTypeBySchema(schema) {
    const typeWithRef = getTypeByRef(schema)
    if (typeWithRef) {
        return typeWithRef
    }

    const arrayType = getTypeFromArray(schema)
    if (arrayType) {
        return arrayType
    }

    const typeFromObject = getTypeFromObject(schema.type)
    if (typeFromObject) {
        return typeFromObject
    }

    const type = getType(schema.type)
    if (type) {
        return type
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
            const clientFile = getClientFile(folder, fileName)

            const returnType = getReturnType(method, pathInfo)
            const parameters = getParameters(method, pathInfo)

            const action = {
                name: actionName,
                returnType: returnType,
                parameters: parameters,
                httpMethod: method,
                path: path
            }

            let imports = []

            if (parameters && parameters.length > 0) {
                imports = [...imports, ...parameters.map(x => x.importType)]
            }

            if (returnType && returnType.importType) {
                imports.push(returnType.importType)
            }

            clientFile.actions.push(action)

            clientFile.imports = clientFile.imports
                .concat(imports.filter(x => x))
                .filter((_import, index, array) => array.indexOf(_import) === index && _import)
        }
    }

    const components = (json.components && json.components.schemas) || json.definitions

    for (const folder of folders) {
        for (const clientFile of folder.clientFiles) {
            for (const _import of clientFile.imports) {
                putModelFile(components, folder, _import)
            }
        }
    }

    return folders
}

function isNullable(property) {
    return property.nullable || property['x-nullable']
}

function putModelFile(components, folder, _import) {
    if (!_import) {
        return
    }

    let modelFile = folder.modelFiles.find(x => x.name === _import)
    if (modelFile) {
        return
    }

    const component = components[_import]

    const fields = []
    const imports = []
    let isEnum = false

    if (component.enum) {
        isEnum = true

        for (let i = 0; i < component.enum.length; i++) {
            const elementValue = component.enum[i]
            const elementName = component['x-enumNames'][i]

            const field = {
                name: elementName || `_${elementValue}`,
                type: elementValue,
                required: true
            }

            fields.push(field)
        }
    } else if (component.type === 'object') {
        for (const [propertyName, propertyInfo] of Object.entries(component.properties)) {
            const arrayType = getTypeFromArray(propertyInfo)
            const typeWithRef = getTypeByRef(propertyInfo)
            const typeFromObject = getTypeFromObject(propertyInfo)

            if (arrayType) {
                const field = {
                    name: propertyName,
                    type: arrayType.type,
                    required: !isNullable(propertyInfo)
                }

                fields.push(field)
                imports.push(arrayType.importType)

                putModelFile(components, folder, arrayType.importType)
            } else if (typeWithRef) {
                const field = {
                    name: propertyName,
                    type: typeWithRef.type,
                    required: !isNullable(propertyInfo)
                }

                fields.push(field)
                imports.push(typeWithRef.importType)

                putModelFile(components, folder, typeWithRef.importType)
            } else if (typeFromObject) {
                const field = {
                    name: propertyName,
                    type: typeFromObject.type,
                    required: !isNullable(propertyInfo)
                }

                fields.push(field)
                imports.push(typeFromObject.importType)

                putModelFile(components, folder, typeFromObject.importType)
            } else if (propertyInfo.enum) {
                const enumTypeName = _import + 'Type'

                const field = {
                    name: propertyName,
                    type: enumTypeName,
                    required: !isNullable(propertyInfo)
                }

                fields.push(field)
                imports.push(enumTypeName)

                const enumFields = []

                for (let i = 0; i < propertyInfo.enum.length; i++) {
                    const elementValue = propertyInfo.enum[i]
                    const elementName = propertyInfo['x-enumNames'][i]

                    const field = {
                        name: elementName || `_${elementValue}`,
                        type: elementValue,
                        required: true
                    }

                    enumFields.push(field)
                }

                modelFile = {
                    name: enumTypeName,
                    isEnum: true,
                    imports: [],
                    fields: enumFields
                }

                folder.modelFiles.push(modelFile)
            } else if (propertyInfo.allOf) {
                const _enum = propertyInfo.allOf[0]
                const typeWithRef = getTypeByRef(_enum)
                const field = {
                    name: propertyName,
                    type: typeWithRef.type,
                    required: !isNullable(propertyInfo)
                }

                fields.push(field)
                imports.push(typeWithRef.importType)

                putModelFile(components, folder, typeWithRef.importType)
            } else {
                const field = {
                    name: propertyName,
                    type: getType(propertyInfo.type).type,
                    required: !isNullable(propertyInfo)
                }

                fields.push(field)
            }
        }
    }

    modelFile = {
        name: _import,
        isEnum: isEnum,
        imports: imports.filter((_i, index, array) => array.indexOf(_i) === index && _i),
        fields: fields
    }

    folder.modelFiles.push(modelFile)
}

module.exports = transform
