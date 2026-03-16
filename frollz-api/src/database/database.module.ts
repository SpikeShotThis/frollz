import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Database } from 'arangojs';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [
    {
      provide: 'ARANGO_DB',
      useFactory: async (configService: ConfigService) => {
        const connectWithRetry = async (maxRetries = 5, delay = 2000): Promise<Database> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const url = configService.get('ARANGODB_URL', 'http://localhost:8529');
              const databaseName = configService.get('ARANGODB_DATABASE', 'frollz');
              const username = configService.get('ARANGODB_USERNAME', 'root');
              const password = configService.get('ARANGODB_PASSWORD', 'rootpassword');

              // Connect to _system first — the target database may not exist yet
              const systemDb = new Database({ url, databaseName: '_system' });
              await systemDb.login(username, password);

              const existing = await systemDb.listDatabases();
              if (!existing.includes(databaseName)) {
                await systemDb.createDatabase(databaseName);
                console.log(`Created database: ${databaseName}`);
              }

              const db = systemDb.database(databaseName);
              console.log('Successfully connected to ArangoDB');
              return db;
            } catch (error) {
              console.log(`ArangoDB connection attempt ${attempt}/${maxRetries} failed:`, error.message);
              
              if (attempt === maxRetries) {
                throw new Error(`Failed to connect to ArangoDB after ${maxRetries} attempts: ${error.message}`);
              }
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        };

        return connectWithRetry();
      },
      inject: [ConfigService],
    },
    DatabaseService,
  ],
  exports: ['ARANGO_DB', DatabaseService],
})
export class DatabaseModule {}