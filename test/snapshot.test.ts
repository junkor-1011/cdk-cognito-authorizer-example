import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TestAppStack } from '../lib/test-app-stack';

describe('snapshot test', () => {
  it("TestApp Stack's Snapshot test", () => {
    const app = new cdk.App();
    const stack = new TestAppStack(app, 'TestAppStack', {
      stageName: 'test',
    });
    const template = Template.fromStack(stack).toJSON();

    expect(template).toMatchSnapshot();
  });
});
