import * as line from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const channelSecret = process.env.LINE_CHANNEL_SECRET!;

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
  if (event.type !== 'message' || event.message.type !== 'text') {
    return;
  }

  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: event.message.text,
  });
};
