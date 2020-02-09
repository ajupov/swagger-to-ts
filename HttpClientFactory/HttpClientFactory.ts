import { Options, createClient, errorHandlingMiddleware, jsonParsingMiddleware } from '@dodopizza/js-http-client'

import IHttpClientFactory from '../api/IHttpClientFactory'

export default class HttpClientFactory implements IHttpClientFactory {
    private readonly _host: string
    private _accessToken: string = ''

    constructor(host: string) {
        this._host = host
    }

    public setNewAccessToken(accessToken: string): void {
        this._accessToken = accessToken
    }

    get host(): string {
        return this._host
    }

    createClient() {
        const options: Options<any> = {
            host: this._host,
            middlewares: [jsonParsingMiddleware<any>(), errorHandlingMiddleware],
            fetchOptions: {
                headers: {
                    'Cache-Control': 'no-cache',
                    Authorization: `Bearer ${this._accessToken}`
                },
                credentials: 'same-origin',
                mode: 'cors'
            },
            preventCaching: true
        }

        return createClient<any>(options)
    }
}
