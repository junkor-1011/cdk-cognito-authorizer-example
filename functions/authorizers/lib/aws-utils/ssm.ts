import {
  SSMClient,
  GetParameterCommand,
  // GetParametersCommand,
} from '@aws-sdk/client-ssm';

export const getParameter = async (name: string, withDecription?: boolean): Promise<string> => {
  const client = new SSMClient({});
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: withDecription,
  });
  const response = await client.send(command);
  const paramValue = response?.Parameter?.Value;
  if (!paramValue) {
    throw new Error(`Not Found Parameter: ${name}`);
  }
  return paramValue;
};
