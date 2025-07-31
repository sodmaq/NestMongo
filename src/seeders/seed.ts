import { NestFactory } from '@nestjs/core';
import { SeederService } from './seeder.service';
import { AppModule } from 'src/app.module';
import { pinoLogger } from 'src/middlewares/logger/pino-logger';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seederService = app.get(SeederService);

  try {
    const command = process.argv[2];

    switch (command) {
      case 'seed':
        await seederService.seedAll();
        break;
      case 'clear':
        await seederService.clearAll();
        break;
      case 'reset':
        await seederService.clearAll();
        await seederService.seedAll();
        break;
      default:
        pinoLogger.info('Available commands:');
        pinoLogger.info('  npm run seed:run seed   - Seed the database');
        pinoLogger.info('  npm run seed:run clear  - Clear the database');
        pinoLogger.info(
          '  npm run seed:run reset  - Clear and seed the database',
        );
        break;
    }
  } catch (error) {
    console.error('Seeder error:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
