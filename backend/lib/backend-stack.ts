import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lex from 'aws-cdk-lib/aws-lex';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lexRole = new iam.Role(this, 'LexRole', {
      assumedBy: new iam.ServicePrincipal('lex.amazonaws.com'),
    });

    const maxPromptRetriesCount: number = 3;

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
      slots: [dateOfBirthSlot],
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
          intents: [signUpIntent, fallbackIntent],
        },
      ],
    });
  }
}
