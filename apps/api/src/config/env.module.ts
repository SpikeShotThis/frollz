import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolveEnvFilePaths } from './load-env.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFilePaths()
    })
  ]
})
export class EnvModule {}
