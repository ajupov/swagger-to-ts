# swagger-to-ts

This tool will be further developed for general use in April 2020.

Our plans:

-   Reformat code
-   Add support configuration files
-   Add support transform other OpenAPI functionality
-   Go to TypeScript
-   Add tests
-   Add publish to npm registry

You can contact me at au073@mail.ru

### Install

`yarn add --dev https://github.com/ajupov/swagger-to-ts`

and add the command `swagger-to-ts` to the `scripts` section of your `package.json`

For example:

```
"scripts": {
   ...
   "generate-api-clients": "swagger-to-ts --input=./swagger.json --output=./api"
   ...
 }
```

-   --input= - input file path or URL to your remote swagger.json

-   --output= - output directory for results

### Usage

`yarn generate-api-clients`

and

implements `IHttpClientFactory` from output directory

and

```
const httpClientFactory = new HttpClientFactory('http://localhost:9000')

const valuesClient = new ValuesClient(httpClientFactory)

const value = await valuesClient.GetAsync(id)

```
