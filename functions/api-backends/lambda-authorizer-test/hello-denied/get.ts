import 'source-map-support/register';

import axios, { AxiosResponse } from 'axios';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyEventHeaders } from 'aws-lambda';

type HeaderWithAuthorization = APIGatewayProxyEventHeaders & {
  Authorization: string;
};

type IdTokenBody = {
  sub: string;
  'cognito:groups': string[];
  iss: string;
  'cognito:username': string;
  origin_jti: string;
  aud: string;
  event_id: string;
  token_use: 'id';
  auth_time: number;
  exp: number;
  iat: number;
  jti: string;
  customKey1: string;
  customKey2: string;
  customKey3: string;
};

const url = 'http://checkip.amazonaws.com';

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  let response: APIGatewayProxyResult;

  const eventHeader = event.headers as HeaderWithAuthorization;
  const idToken = eventHeader.Authorization;
  const idTokenDecoded = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString()) as IdTokenBody;
  try {
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
    const myUrlData: AxiosResponse<string> = await axios(url);
    const myUrl = myUrlData.data.trim();
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'denied lambda example',
        url: myUrl,
        customClaimsValue: {
          customKey1: idTokenDecoded.customKey1,
          customKey2: idTokenDecoded.customKey2,
          customKey3: idTokenDecoded.customKey3,
        },
      }),
    };
  } catch (err) {
    console.log(err);
    response = {
      statusCode: 500,
      body: JSON.stringify({
        message: 'some error happened',
      }),
    };
  }

  return response;
};
