import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lex from 'aws-cdk-lib/aws-lex';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lexRole = new iam.Role(this, 'LexRole', {
      assumedBy: new iam.ServicePrincipal('lex.amazonaws.com'),
    });

    const maxPromptRetriesCount: number = 3;

    const genderSlotType: lex.CfnBot.SlotTypeProperty = {
      name: 'Gender',
      valueSelectionSetting: {
        resolutionStrategy: 'ORIGINAL_VALUE',
      },
      slotTypeValues: [
        {
          sampleValue: {
            value: '男性',
          },
        },
        {
          sampleValue: {
            value: '女性',
          },
        },
        {
          sampleValue: {
            value: 'その他',
          },
        },
      ],
    };

    const genderSlot: lex.CfnBot.SlotProperty = {
      name: 'Gender',
      slotTypeName: 'Gender',
      valueElicitationSetting: {
        slotConstraint: 'Required',
        promptSpecification: {
          maxRetries: maxPromptRetriesCount,
          messageGroupsList: [
            {
              message: {
                plainTextMessage: {
                  value: '性別を教えてください。',
                },
              },
            },
          ],
        },
      },
    };

    const dateOfBirthSlot: lex.CfnBot.SlotProperty = {
      name: 'DateOfBirth',
      slotTypeName: 'AMAZON.Date',
      valueElicitationSetting: {
        slotConstraint: 'Required',
        promptSpecification: {
          maxRetries: maxPromptRetriesCount,
          messageGroupsList: [
            {
              message: {
                plainTextMessage: {
                  value: '生年月日を教えてください。',
                },
              },
            },
          ],
        },
      },
    };

    const signUpIntent: lex.CfnBot.IntentProperty = {
      name: 'SignUp',
      sampleUtterances: [
        {
          utterance: '入会',
        },
      ],
      slots: [genderSlot, dateOfBirthSlot],
    };

    const fallbackIntent: lex.CfnBot.IntentProperty = {
      name: 'FallbackIntent',
      parentIntentSignature: 'AMAZON.FallbackIntent',
    };

    const bot = new lex.CfnBot(this, 'SignUpBot', {
      name: 'SignUpBot',
      idleSessionTtlInSeconds: 5 * 60,
      roleArn: lexRole.roleArn,
      dataPrivacy: {
        ChildDirected: true,
      },
      botLocales: [
        {
          localeId: 'ja_JP',
          nluConfidenceThreshold: 0.4,
          slotTypes: [genderSlotType],
          intents: [signUpIntent, fallbackIntent],
        },
      ],
    });

    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );
    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonLexRunBotsOnly')
    );
    const lineWebhookFunc = new NodejsFunction(this, 'LineWebhookFunc', {
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET!,
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
      },
      role: lambdaRole,
      entry: 'lambda/line-webhook.ts',
    });

    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'ChatBotAPI',
      cloudWatchRole: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        statusCode: 200,
      },
    });

    api.root.addMethod(
      'POST',
      new apigateway.LambdaIntegration(lineWebhookFunc),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json; charset=UTF-8': apigateway.Model.EMPTY_MODEL,
            },
          },
        ],
      }
    );
  }
}
