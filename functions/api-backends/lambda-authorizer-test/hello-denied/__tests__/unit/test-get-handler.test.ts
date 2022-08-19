import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { lambdaHandler } from '../../get';

const idTokenBodySample = {
  sub: '70cd37e3-c106-4bd2-9fdc-b829c02d31ce',
  'cognito:groups': ['group-A', 'group-B', 'group-C'],
  iss: 'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_7m9MVXLQC',
  'cognito:username': 'fire',
  customKey3: 'apple orange grape',
  origin_jti: '5ce99fe4-d84b-455a-b7bc-2458ad29be9a',
  customKey2: 'red green blue',
  aud: '1ff1dlrh5bse40h067ilhtf0fp',
  event_id: '7e3e8513-fda7-4bd9-bd78-c65dca4edbe6',
  token_use: 'id',
  customKey1: 'custom-string',
  auth_time: 1660315815,
  exp: 1660319415,
  iat: 1660315815,
  jti: 'ad800d3e-3e6e-42bd-9529-84ad5a0a9c49',
};
const authorizationSample = `xxx.${Buffer.from(JSON.stringify(idTokenBodySample)).toString('base64')}.xxx`;

describe('Unit test for app handler', function () {
  it('verifies successful response', async () => {
    const event: APIGatewayProxyEvent = {
      httpMethod: 'get',
      body: '',
      headers: {
        Authorization: authorizationSample,
      },
      isBase64Encoded: false,
      multiValueHeaders: {},
      multiValueQueryStringParameters: {},
      path: '/hello',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {
        accountId: '123456789012',
        apiId: '1234',
        authorizer: {},
        httpMethod: 'get',
        identity: {
          accessKey: '',
          accountId: '',
          apiKey: '',
          apiKeyId: '',
          caller: '',
          clientCert: {
            clientCertPem: '',
            issuerDN: '',
            serialNumber: '',
            subjectDN: '',
            validity: { notAfter: '', notBefore: '' },
          },
          cognitoAuthenticationProvider: '',
          cognitoAuthenticationType: '',
          cognitoIdentityId: '',
          cognitoIdentityPoolId: '',
          principalOrgId: '',
          sourceIp: '',
          user: '',
          userAgent: '',
          userArn: '',
        },
        path: '/lambda-authorizer-test/hello-denied',
        protocol: 'HTTP/1.1',
        requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
        requestTimeEpoch: 1428582896000,
        resourceId: '123456',
        resourcePath: '/lambda-authorizer-test/hello-denied',
        stage: 'dev',
      },
      resource: '',
      stageVariables: {},
    };
    const result: APIGatewayProxyResult = await lambdaHandler(event);

    expect(result.statusCode).toBe(200);
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */
    expect(JSON.parse(result.body).message).toBe('denied lambda example');
  });
});
