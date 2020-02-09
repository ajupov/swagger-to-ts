import { HttpClientFactoryBuilder } from './HttpClientFactoryBuilder'

export default class Create {
    public static get HttpClientFactory(): HttpClientFactoryBuilder {
        return new HttpClientFactoryBuilder()
    }
}
