import 'source-map-support/register';

import type { APIGatewayAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

import { generatePolicy, verifyToken } from '../lib/utils';

/**
 * modified APIGatewayAuthorizerEvent
 *
 * add authorizationToken
 */
type Event = APIGatewayAuthorizerEvent & {
  authorizationToken: string;
};

export const lambdaHandler = async (event: Event): Promise<APIGatewayAuthorizerResult> => {
  if (event.type !== 'TOKEN') {
    console.log(`expected authorization type is TOKEN, got ${event.type}`);
    return generatePolicy('', 'Deny', event.methodArn);
  }
  const token = event.authorizationToken;

  let principalId: string;
  try {
    const tokenInfo = await verifyToken(token);
    const fruits = tokenInfo.customKey3.split(' ').filter((x) => !!x);
    console.log("[INFO]user's fruits:", fruits);
    if (!fruits.includes('melon')) {
      console.log('user do not have "melon".');
      return generatePolicy('', 'Deny', event.methodArn);
    }
    principalId = tokenInfo['cognito:username']; // TMP
  } catch (err) {
    console.log(`failed to verify token. error:`, err);
    return generatePolicy('', 'Deny', event.methodArn);
  }
  return generatePolicy(principalId, 'Allow', event.methodArn);
};
