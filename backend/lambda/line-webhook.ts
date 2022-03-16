import {
  LexRuntimeV2Client,
  RecognizeTextCommand,
  RecognizeTextCommandOutput,
} from '@aws-sdk/client-lex-runtime-v2';
import * as line from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const channelSecret = process.env.LINE_CHANNEL_SECRET!;
const awsRegion = process.env.AWS_REGION!;
const botId = process.env.LEX_BOT_ID!;
const botAliasId = process.env.LEX_BOT_ALIAS_ID!;
const localeId = process.env.LEX_LOCALE_ID!;

export const handler = async (event: any) => {
  const eventBody: line.WebhookRequestBody = JSON.parse(event.body);
  const events: line.WebhookEvent[] = eventBody.events;

  for (const event of events) {
    await handleEvent(event);
  }

  return {
    statusCode: 200,
    body: 'OK',
    isBase64Encoded: false,
  };
};

const lineClient = new line.Client({
  channelAccessToken,
  channelSecret,
});

const handleEvent = async (
  event: line.WebhookEvent
): Promise<void | line.MessageAPIResponseBase> => {
  if (
    event.type !== 'message' ||
    event.message.type !== 'text' ||
    event.source.userId === undefined
  ) {
    return;
  }

  const message = await postTextToLex(event.source.userId, event.message.text);

  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: message,
  });
};

const lexClient = new LexRuntimeV2Client({
  region: awsRegion,
});

const postTextToLex = async (
  userId: string,
  message: string
): Promise<string> => {
  const command = new RecognizeTextCommand({
    botAliasId: botAliasId,
    botId: botId,
    localeId: localeId,
    sessionId: userId,
    text: message,
  });

  let responseMessage: string;
  try {
    const response = await lexClient.send(command);

    if (isSessionClosed(response)) {
      return `Intent is closed.`;
    }

    responseMessage = response.messages?.[0].content ?? 'Something went wrong.';
    console.log(`message: ${responseMessage}`);
  } catch (error) {
    console.log(error);
    responseMessage = 'Error occurred.';
  }

  return responseMessage;
};

const isSessionClosed = (response: RecognizeTextCommandOutput): boolean =>
  response?.sessionState?.dialogAction?.type === 'Close';
