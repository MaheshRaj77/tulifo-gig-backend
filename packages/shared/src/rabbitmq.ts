import amqplib from 'amqplib';
import { logger } from './logger';

// Using any for connection/channel due to amqplib type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let connection: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let channel: any = null;

export async function connectRabbitMQ() {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  
  try {
    connection = await amqplib.connect(url);
    channel = await connection.createChannel();
    
    logger.info('Connected to RabbitMQ');

    connection.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      channel = null;
    });

    return channel;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ not connected. Call connectRabbitMQ() first.');
  }
  return channel;
}

export async function publishEvent(exchange: string, routingKey: string, message: unknown): Promise<boolean> {
  const ch = getChannel();
  await ch.assertExchange(exchange, 'topic', { durable: true });
  
  return ch.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
}

export async function consumeQueue(
  queue: string,
  handler: (message: unknown) => Promise<void>,
  options?: { exchange?: string; routingKey?: string }
): Promise<void> {
  const ch = getChannel();
  
  await ch.assertQueue(queue, { durable: true });
  
  if (options?.exchange && options?.routingKey) {
    await ch.assertExchange(options.exchange, 'topic', { durable: true });
    await ch.bindQueue(queue, options.exchange, options.routingKey);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await ch.consume(queue, async (msg: any) => {
    if (msg) {
      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content);
        ch.ack(msg);
      } catch (error) {
        logger.error('Error processing message:', error);
        ch.nack(msg, false, false);
      }
    }
  });
}

export async function disconnectRabbitMQ(): Promise<void> {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
    logger.info('Disconnected from RabbitMQ');
  }
}
