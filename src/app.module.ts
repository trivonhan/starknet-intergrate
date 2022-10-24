import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ERC721Service } from './erc721.service';
import { StarknetService } from './starknet.service';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, StarknetService, ERC721Service],
})
export class AppModule {}
