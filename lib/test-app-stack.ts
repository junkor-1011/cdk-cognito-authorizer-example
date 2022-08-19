import {
  Aws,
  Duration,
  Stack,
  StackProps,
  aws_iam as iam,
  aws_apigateway as apigateway,
  aws_cognito as cognito,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

type StageStackProps = StackProps & {
  stageName: string;
};

export class TestAppStack extends Stack {
  constructor(scope: Construct, id: string, props: StageStackProps) {
    super(scope, id, props);

    const readSSMParamLambdaRole = new iam.Role(this, 'ReadSSMParamLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Lambda reading param from ssm',
    });
    readSSMParamLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    );
    readSSMParamLambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'));

    const pool = new cognito.UserPool(this, 'Pool');
    const client = pool.addClient('app-client', {
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID],
        callbackUrls: ['http://localhost:3000/api/auth/callback/cognito'],
      },
      authFlows: { adminUserPassword: true }, // use cognitoIdp:adminInitiateAuth API
      generateSecret: true,
      refreshTokenValidity: Duration.hours(12),
    });
    const domain = pool.addDomain('CognitoDomain', {
      cognitoDomain: {
        // TODO: SHOULD GET VALUE FROM SSM PARAMETER OR SECRETS MANAGER
        domainPrefix: 'super-ultra-hyper-extreme-temporary-app', // TMP
      },
    });

    const preTokenGenerationLambda = new NodejsFunction(this, 'preTokenGenerationLambda', {
      entry: 'functions/UserPoolTriggers/preTokenGeneration.ts',
      handler: 'lambdaHandler',
      runtime: Runtime.NODEJS_16_X,
      bundling: {
        sourceMap: true,
      },
      environment: {
        stageName: props.stageName,
      },
    });

    pool.addTrigger(cognito.UserPoolOperation.PRE_TOKEN_GENERATION, preTokenGenerationLambda);

    const iamRoleForLambda = new iam.Role(this, 'iamRoleForLambda', {
      roleName: `hello-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });

    const helloLambda = new NodejsFunction(this, 'Hello', {
      entry: 'functions/api-backends/hello/get.ts',
      handler: 'lambdaHandler',
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(30),
      role: iamRoleForLambda,
      bundling: {
        sourceMap: true,
      },
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      memorySize: 128,
    });

    const acceptTestLambda = new NodejsFunction(this, 'AcceptTest', {
      entry: 'functions/api-backends/lambda-authorizer-test/hello-accept/get.ts',
      handler: 'lambdaHandler',
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(30),
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        stageName: props.stageName,
      },
      memorySize: 128,
      bundling: {
        sourceMap: true,
      },
    });

    const deniedTestLambda = new NodejsFunction(this, 'DeniedTest', {
      entry: 'functions/api-backends/lambda-authorizer-test/hello-denied/get.ts',
      handler: 'lambdaHandler',
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(30),
      environment: {
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        stageName: props.stageName,
      },
      memorySize: 128,
      bundling: {
        sourceMap: true,
      },
    });

    const tokenAuthorizerColorLambda = new NodejsFunction(this, 'ColorAuthorizerLambda', {
      entry: 'functions/authorizers/color/index.ts',
      handler: 'lambdaHandler',
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(20),
      role: readSSMParamLambdaRole,
      bundling: {
        sourceMap: true,
      },
      environment: {
        stageName: props.stageName,
        jwksuri: `https://cognito-idp.${Aws.REGION}.amazonaws.com/${pool.userPoolId}/.well-known/jwks.json`,
        issuer: `https://cognito-idp.${Aws.REGION}.amazonaws.com/${pool.userPoolId}`,
        audience: client.userPoolClientId,
      },
    });

    const tokenAuthorizerFruitsLambda = new NodejsFunction(this, 'FruitsAuthorizerLambda', {
      entry: 'functions/authorizers/fruits/index.ts',
      handler: 'lambdaHandler',
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(20),
      role: readSSMParamLambdaRole,
      bundling: {
        sourceMap: true,
      },
      environment: {
        stageName: props.stageName,
        jwksuri: `https://cognito-idp.${Aws.REGION}.amazonaws.com/${pool.userPoolId}/.well-known/jwks.json`,
        issuer: `https://cognito-idp.${Aws.REGION}.amazonaws.com/${pool.userPoolId}`,
        audience: client.userPoolClientId,
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'cognitoAuthorizer', {
      authorizerName: `${props.stageName}-CognitoAurhorizer`,
      cognitoUserPools: [pool],
    });

    const colorAuthorizer = new apigateway.TokenAuthorizer(this, 'ColorAuthorizer', {
      authorizerName: `${props.stageName}-ColorAurhorizer`,
      handler: tokenAuthorizerColorLambda,
    });

    const fruitsAuthorizer = new apigateway.TokenAuthorizer(this, 'FruitsAuthorizer', {
      authorizerName: `${props.stageName}-FruitsAurhorizer`,
      handler: tokenAuthorizerFruitsLambda,
    });

    const api = new apigateway.RestApi(this, 'helloApigateway', {
      restApiName: `testapp-apigateway`,
    });

    const hello = api.root.addResource('hello');
    hello.addMethod('GET', new apigateway.LambdaIntegration(helloLambda), {
      authorizer: cognitoAuthorizer,
    });
    const lambdaAuthorizerTest = api.root.addResource('lambda-authorizer-test');
    lambdaAuthorizerTest
      .addResource('hello-accept')
      .addMethod('GET', new apigateway.LambdaIntegration(acceptTestLambda), {
        authorizer: colorAuthorizer,
      });
    lambdaAuthorizerTest
      .addResource('hello-denied')
      .addMethod('GET', new apigateway.LambdaIntegration(deniedTestLambda), {
        authorizer: fruitsAuthorizer,
      });

    // SSM Parameteres
    new ssm.StringParameter(this, `poolid-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/COGNITO_POOL_ID`,
      stringValue: pool.userPoolId,
      type: ssm.ParameterType.STRING,
    });
    new ssm.StringParameter(this, `poolclientid-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/COGNITO_POOL_CLIENT_ID`,
      stringValue: client.userPoolClientId,
      type: ssm.ParameterType.STRING,
    });
    new ssm.StringParameter(this, `poolclient-domainname-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/COGNITO_POOL_CLIENT_DOMAN_NAME`,
      stringValue: domain.domainName,
      type: ssm.ParameterType.STRING,
    });
    new ssm.StringParameter(this, `poolclient-domainurl-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/COGNITO_POOL_CLIENT_DOMAN_URL`,
      stringValue: `https://${domain.domainName}.auth.${Aws.REGION}.amazoncognito.com`,
      type: ssm.ParameterType.STRING,
    });
    /*
    new ssm.StringParameter(this, `poolclient-secret-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/COGNITO_POOL_CLIENT_SECRET`,
      stringValue: client.userPoolClientSecret.unsafeUnwrap(),
      type: ssm.ParameterType.SECURE_STRING,
    });
    */

    new ssm.StringParameter(this, `audience-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/AUDIENCE`,
      stringValue: client.userPoolClientId,
      type: ssm.ParameterType.STRING,
    });
    new ssm.StringParameter(this, `issuer-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/ISSUER`,
      stringValue: `https://cognito-idp.${Aws.REGION}.amazonaws.com/${pool.userPoolId}`,
      type: ssm.ParameterType.STRING,
    });
    new ssm.StringParameter(this, `jwksuri-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/JWKS_URI`,
      stringValue: `https://cognito-idp.${Aws.REGION}.amazonaws.com/${pool.userPoolId}/.well-known/jwks.json`,
      type: ssm.ParameterType.STRING,
    });

    new ssm.StringParameter(this, `restapiId-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/REST_API_ID`,
      stringValue: api.restApiId,
      type: ssm.ParameterType.STRING,
    });
    new ssm.StringParameter(this, `restapiUrl-${props.stageName}`, {
      parameterName: `/TESTAPPX/${props.stageName}/REST_API_BASE_URL`,
      stringValue: api.url,
      type: ssm.ParameterType.STRING,
    });
  }
}
