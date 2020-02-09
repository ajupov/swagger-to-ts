export interface IHttpClient {
    get: <Result>(url: string, data?: any, headers?: HeadersInit) => Promise<Result>
    post: <Result>(url: string, data?: any, headers?: HeadersInit) => Promise<Result>
}

export default interface IHttpClientFactory {
    readonly host: string
    setNewAccessToken?(accessToken: string): void
    createClient(host: string): IHttpClient
}
