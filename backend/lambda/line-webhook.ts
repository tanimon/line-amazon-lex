import {
  LexRuntimeV2Client,
  RecognizeTextCommand,
  RecognizeTextCommandOutput,
  MessageContentType,
  DialogActionType,
  Message as LexMessage,
} from '@aws-sdk/client-lex-runtime-v2';
import * as line from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const channelSecret = process.env.LINE_CHANNEL_SECRET!;
const awsRegion = process.env.AWS_REGION!;
const botId = process.env.LEX_BOT_ID!;
const botAliasId = process.env.LEX_BOT_ALIAS_ID!;
const localeId = process.env.LEX_LOCALE_ID!;

export const handler = async (event: any) => {
  console.log(`event: ${JSON.stringify(event)}`);

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
  console.log(`event: ${JSON.stringify(event)}`);

  // テキストメッセージ以外は処理しない
  if (
    event.type !== 'message' ||
    event.message.type !== 'text' ||
    event.source.userId === undefined
  ) {
    return;
  }

  const message = await postTextToLex(event.source.userId, event.message.text);

  return lineClient.replyMessage(event.replyToken, message);
};

const lexClient = new LexRuntimeV2Client({
  region: awsRegion,
});

const postTextToLex = async (
  userId: string,
  message: string
): Promise<line.Message> => {
  console.log(`userId: ${userId}, message: ${message}`);

  const command = new RecognizeTextCommand({
    botAliasId: botAliasId,
    botId: botId,
    localeId: localeId,
    sessionId: userId,
    text: message,
  });

  console.log(`command: ${JSON.stringify(command)}`);

  try {
    const response = await lexClient.send(command);

    console.log(`response: ${JSON.stringify(response)}`);

    if (isSessionClosed(response)) {
      console.log('Session is closed.');
      const message = response.messages?.[0]?.content ?? 'Intent is closed.';
      return createTextMessage(message);
    }

    const responseMessage = response.messages?.[0];
    if (!responseMessage) {
      return createTextMessage('No response message.');
    }

    const messageContent = responseMessage.content;
    if (!messageContent) {
      return createTextMessage('No message content.');
    }

    console.log(`messageContent: ${messageContent}`);

    if (isCustomPayloadMessage(responseMessage)) {
      console.log('This is custom payload message.');
      return createTemplateMessage(messageContent);
    }

    return createTextMessage(messageContent);
  } catch (error) {
    console.log(error);
    return createTextMessage('Error occurred.');
  }
};

const isSessionClosed = (response: RecognizeTextCommandOutput): boolean =>
  response?.sessionState?.dialogAction?.type === DialogActionType.CLOSE;

const isCustomPayloadMessage = (message: LexMessage): boolean => {
  const messageContent = message!.content!.trim();
  return (
    message?.contentType === MessageContentType.CUSTOM_PAYLOAD &&
    messageContent.startsWith('{') === true &&
    messageContent.endsWith('}') === true
  );
};

const createTextMessage = (message: string): line.TextMessage => {
  return {
    type: 'text',
    text: message,
  };
};

const createTemplateMessage = (payload: string): line.TemplateMessage => {
  return JSON.parse(payload) as unknown as line.TemplateMessage;
};
