import { NestFactory } from '@nestjs/core';
import { CatalogModule } from './catalog.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  process.title = 'catalog';

  const logger = new Logger('CatalogBootstrap');

 const rmqUrl = process.env.RABBITMQ_URL ?? 'amqp://localhost:5673';

  const queue = process.env.MEDIA_QUEUE ?? 'catalog_queue';

  //create an microservices instance
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    CatalogModule,
   {
      transport: Transport.RMQ,
      options: {
        urls: [rmqUrl],
        queue,
        queueOptions: {
          durable: false,
        },
      },
    },
  );

  app.enableShutdownHooks();
  await app.listen();
  logger.log(`Catalog RMQ listening  on queue: ${queue} via ${rmqUrl}`);
}
bootstrap();
