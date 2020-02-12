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
            models: [],
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
            // Old
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

            // New
            // const schema = pathInfo[method].requestBody.content[ApplicationJsonContentType].schema
            // const type = getType(schema)

            // let name = ''
            // switch (type.type) {
            //     case 'boolean[]':
            //     case 'number[]':
            //     case 'string[]':
            //         name = 'values'
            //         break
            //     default:
            //         name = type.type
            //             .split(/(?=[A-Z])/)
            //             .slice(-1)[0]
            //             .toLowerCase()
            //         break
            // }

            // const parameter = {
            //     name: name,
            //     required: true,
            //     type: type.type,
            //     importType: type.importType
            // }

            // return [{ ...parameter }]

            throw 'error'

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

        default:
            return undefined
    }
}

function getTypeBySchema(schema) {
    const objectPath = schema[ReferenceObject]
    if (objectPath) {
        // Dodo.RestaurantCashier.Web.Areas.v2.Models.Products.GetMenuItemResponse
        // GetMenuItemResponse
        const type = objectPath.split('/').slice(-1)[0]
        const typeUnderscored = type.replace(/\./g, '_')

        return { type: typeUnderscored, importType: typeUnderscored }
    }

    const type = getType(schema.type)
    if (type) {
        return type
    }

    switch (schema.type) {
        case 'object':
            const additionalProperties = schema.additionalProperties
            if (additionalProperties) {
                if (additionalProperties[ReferenceObject]) {
                    // Dodo.RestaurantCashier.Web.Areas.v2.Models.Products.GetMenuItemResponse
                    const type = additionalProperties[ReferenceObject].split('/').slice(-1)[0]
                    const typeUnderscored = type.replace(/\./g, '_')

                    return { type: typeUnderscored + '[]', importType: typeUnderscored }
                } else {
                    throw 'error'
                }
            } else {
                return { type: 'object', importType: undefined }
            }

        case 'array':
            if (schema.items[ReferenceObject]) {
                // Dodo.RestaurantCashier.Web.Areas.v2.Models.Products.GetMenuItemResponse
                const type = schema.items[ReferenceObject].split('/').slice(-1)[0]
                const typeUnderscored = type.replace(/\./g, '_')

                return { type: typeUnderscored + '[]', importType: typeUnderscored }
            } else {
                const type = getTypeBySchema(schema.items)

                return { type: type.type + '[]', importType: type.importType }
            }
    }
}

function transform(json) {
    let folders = []

    for (const [path, pathInfo] of Object.entries(json.paths)) {
        // GetPizzas
        const actionName = getActionName(path)

        // v2
        const folderName = getFolderName(path)

        // clients
        const folder = getFolder(folders, folderName)

        for (const [method, methodInfo] of Object.entries(pathInfo)) {
            // ProductsClient
            const fileName = getFileName(methodInfo)
            const file = getClientFile(folder, fileName)

            const returnType = getReturnType(method, pathInfo)
            const parameters = getParameters(method, pathInfo)

            const action = {
                name: actionName,
                returnType: returnType,
                parameters: parameters,
                httpMethod: method,
                path: path
            }

            // if (isModelType(returnType.importType) && !file.models.find(x => x.name === returnType.importType)){
            //     const schema = json.components.schemas[returnType.importType]

            //    switch (schema.type ){
            //        case 'object':
            //             const fields = []

            //            for(const [fieldName, fieldInfo] of Object.entries(schema.properties)){
            //             const field = {
            //                 name: fieldName,
            //                 type:
            //             }

            //             fields.push({

            //             })
            //            }
            //    }
            //     file.models.push({
            //         name: returnType.importType,
            //         type: schema.type,
            //         fields: schema.type === 'object' ?  schema.properties
            //     })
            // }

            // [undefined, undefined]
            const imports = (parameters && parameters.length > 0
                ? [...parameters.map(x => x.importType), returnType.importType]
                : [returnType.importType]
            ).filter(x => x)

            file.actions.push(action)

            file.imports = file.imports
                .concat(imports)
                .filter((_import, index, array) => array.indexOf(_import) === index && _import)
        }
    }

    // for (const folder of folders) {
    //     for (const clientFile of folder.clientFiles) {
    //         for (const _import of clientFile.imports) {
    //             let model = folder.modelFiles.find(x => x.name === _import)
    //             if (model) {
    //                 continue
    //             }

    //             model = {
    //                 name: _import
    //             }

    //             folder.modelFiles.push(model)
    //         }
    //     }
    // }

    return folders
}

module.exports = transform
