import crypto from 'node:crypto';

export class MockAIAdapter {
  async generateReply({ message, contact }) {
    return `[Mock AI · ${contact.language}] Thanks for your message: ${message}`;
  }
}

export class MockMessagingAdapter {
  async send(payload) {
    return { providerMessageId: `mock-${crypto.randomUUID()}`, deliveryStatus: 'sent', simulated: true, ...payload };
  }
}

export const aiAdapter = new MockAIAdapter();
export const messagingAdapter = new MockMessagingAdapter();
