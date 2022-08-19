import type { APIGatewayAuthorizerResult } from 'aws-lambda';

import { decode, JsonWebTokenError, TokenExpiredError, verify, JwtPayload } from 'jsonwebtoken';
import jwks from 'jwks-rsa';
// import { promisify } from 'util';

import { getParameter } from '../lib/aws-utils/ssm';

export const generatePolicy = (
  principal: string,
  effect: 'Allow' | 'Deny',
  resource: string,
): APIGatewayAuthorizerResult => {
  return {
    principalId: principal,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};

type VerifiedTokenInfo = JwtPayload & {
  'cognito:username': string;
  'cognito:groups': string[];
  customKey1: string;
  customKey2: string;
  customKey3: string;
};

export const verifyToken = async (token: string): Promise<VerifiedTokenInfo> => {
  // TODO: using environment variable from ssm parameters
  const { stageName } = process.env;
  if (!stageName) {
    throw new Error('failed to get env: stagename');
  }
  const issuer = await getParameter(`/TESTAPP/${stageName}/ISSUER`, true);
  const audience = await getParameter(`/TESTAPP/${stageName}/AUDIENCE`, true);
  const jwksuri = await getParameter(`/TESTAPP/${stageName}/JWKS_URI`, true);

  const decoded = decode(token, { complete: true });
  if (!decoded || !decoded['header'] || !decoded['header'].kid) {
    throw new JsonWebTokenError('invalid token');
  }

  const client = jwks({ jwksUri: jwksuri });
  const key = await client.getSigningKey(decoded['header'].kid);
  const signingKey = key.getPublicKey();

  let res: VerifiedTokenInfo;
  try {
    // TODO: explain why use as(or add user-define type-guard)
    const tokenInfo = verify(token, signingKey, {
      audience,
      issuer,
    }) as VerifiedTokenInfo;
    console.log('tokenInfo: ', tokenInfo);
    res = tokenInfo;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new Error('token expired');
    }
    if (err instanceof JsonWebTokenError) {
      throw new Error('token is invalid');
    }
    throw err;
  }

  return res;
};
