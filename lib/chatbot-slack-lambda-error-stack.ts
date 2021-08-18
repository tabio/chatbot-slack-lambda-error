import * as cdk from '@aws-cdk/core';
import * as lambda from "@aws-cdk/aws-lambda";
import * as cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as cwactions from "@aws-cdk/aws-cloudwatch-actions";
import * as sns from "@aws-cdk/aws-sns";
import * as iam from "@aws-cdk/aws-iam";
import * as chatbot from "@aws-cdk/aws-chatbot";

export class ChatbotSlackLambdaErrorStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // lambda
    const lambdaFn = new lambda.Function(this, "HelloWorldSample", {
      code: lambda.Code.fromAsset("./lib/lambda"),
      handler: "hello.handler",
      runtime: lambda.Runtime.NODEJS_14_X,
    });

    // Chatbot Role & Policy
    const chatbotRole = new iam.Role(this, "iamrole-chatbot", {
      roleName: "iamrole-chatbot-",
      assumedBy: new iam.ServicePrincipal("chatbot.amazonaws.com"),
    });

    chatbotRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: [
          "cloudwatch:Describe*",
          "cloudwatch:Get*",
          "cloudwatch:List*",
          "logs:Describe*",
          "logs:Get*",
          "logs:List*",
          "logs:StartQuery",
          "logs:StopQuery",
          "logs:TestMetricFilter",
          "logs:FilterLogEvents"
        ],
      })
    );

    // SNS TOPIC
    const topic = new sns.Topic(this, "sns-topic-lambda-error", {
      displayName: "SnsTopicLambdaErrorAlarm",
      topicName: "SnsTopicLambdaErrorAlarm",
    });

    // Metric
    const metric = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensions: { FunctionName: lambdaFn.functionName },
    });

    const alarm = new cloudwatch.Alarm(this, "LambdaErrorAlarm", {
      metric:  metric,
      actionsEnabled: true,
      threshold: 0,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      statistic: 'Sum',
    });

    const action = new cwactions.SnsAction(topic);
    alarm.addAlarmAction(action);

    // Chatbot Slack Notification Integration
    new chatbot.SlackChannelConfiguration(this, "chatbot-slack-notification", {
      slackChannelConfigurationName: "chatbot-slack-notification",
      role: chatbotRole,
      slackChannelId: "hoge", // TODO: each env
      slackWorkspaceId: "fuga", // TODO: each env
      loggingLevel: chatbot.LoggingLevel.ERROR,
      notificationTopics: [topic],
    });
  }
}
