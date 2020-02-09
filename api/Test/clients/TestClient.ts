import IHttpClientFactory from '../../IHttpClientFactory'
import Test from '../models/Test'

export default class TestClient {
    private readonly httpClientFactory: IHttpClientFactory

    constructor(httpClientFactory: IHttpClientFactory) {
        this.httpClientFactory = httpClientFactory
    }

    // prettier-ignore
    public GetAsync = (id: string): Promise<Test> =>
        this.httpClientFactory
            .createClient(this.httpClientFactory.host)
            .get<Test>('/Products/v1/GetTypes')

    // prettier-ignore
    public PostAsync = (test: Test): Promise<string> =>
        this.httpClientFactory
            .createClient(this.httpClientFactory.host)
            .post<string>('/Activities/Create', test)
}
