import HttpClientFactory from './HttpClientFactory'
import IHttpClientFactory from '../api/IHttpClientFactory'

export class HttpClientFactoryBuilder {
    private _host: string = ''
    private _accessToken: string = ''

    public WithHost(host: string): HttpClientFactoryBuilder {
        this._host = host
        return this
    }

    public WithAccessToken(accessToken: string): HttpClientFactoryBuilder {
        this._accessToken = accessToken
        return this
    }

    public Build(): IHttpClientFactory {
        const httpClientFactory = new HttpClientFactory(this._host)

        httpClientFactory.setNewAccessToken(this._accessToken)

        return httpClientFactory
    }
}
