import { LexV2Event, LexV2Message, LexV2Result } from 'aws-lambda';

export const handler = async (event: LexV2Event): Promise<LexV2Result> => {
  console.log(JSON.stringify(event));
  return dispatch(event);
};

const closeDialog = (event: LexV2Event, message: LexV2Message): LexV2Result => {
  const result: LexV2Result = {
    sessionState: {
      ...event.sessionState,
      intent: {
        ...event.sessionState.intent,
        state: 'Fulfilled',
      },
      dialogAction: {
        type: 'Close',
      },
    },
    messages: [message],
  };

  console.log(`result: ${JSON.stringify(result)}`);

  return result;
};

const handleBookCar = (event: LexV2Event): LexV2Result => {
  const message: LexV2Message = {
    contentType: 'PlainText',
    content: 'Fulfillment message.',
  };

  return closeDialog(event, message);
};

const dispatch = (event: LexV2Event): LexV2Result => {
  const intentName = event.sessionState.intent.name;

  switch (intentName) {
    case 'BookCar':
      return handleBookCar(event);
    default:
      console.error(`Unknown intent: ${intentName}`);
      return {} as LexV2Result;
  }
};
