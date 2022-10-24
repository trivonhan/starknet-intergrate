import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { OZAccountDto } from './dto/oz-account.dto';
import { ERC721Service } from './erc721.service';
import { StarknetService } from './starknet.service';

@Controller('starknet')
export class AppController {
  constructor(
    private readonly starknetService: StarknetService,
    private readonly erc721Service: ERC721Service,
  ) {}

  @Get('starknet')
  starknet(): Promise<void> {
    return this.starknetService.main();
  }

  @Get('erc721/oz-account')
  createOZAccount(): Promise<OZAccountDto> {
    return this.erc721Service.createOZAccount();
  }

  @Post('erc721/address')
  deployERC721(@Body() dto): Promise<string> {
    return this.erc721Service.deployERC721(dto.ownerContractAdr);
  }
  @Get('erc721/name')
  getNameContract(@Body() dto): Promise<string> {
    return this.erc721Service.getNameContract(dto.erc721Address);
  }
  @Post('erc721/mint-with-uri')
  mintAndSetTokenURI(@Body() dto): Promise<void> {
    console.log('DTO: ', dto);
    return this.erc721Service.mintAndSetTokenURI(
      dto.privateKey,
      dto.accContract,
      dto.erc721Address,
      dto.tokenId,
      dto.mintTo,
    );
  }
  @Post('erc721/mint')
  mintToken(@Body() dto): Promise<string> {
    return this.erc721Service.mintWithOwner(
      dto.privateKey,
      dto.accContract,
      dto.erc721Address,
      dto.tokenId,
      dto.amount,
      dto.mintTo,
    );
  }

  @Delete('erc721/burn')
  burnToken(@Body() dto): Promise<string> {
    return this.erc721Service.burnToken(
      dto.nftOwnerAccountAddress,
      dto.privateKey,
      dto.erc721Address,
      dto.tokenId,
    );
  }

  @Post('erc721/set-token-uri')
  setTokenURI(@Body() dto): Promise<string> {
    return this.erc721Service.setTokenURI(
      dto.accContract,
      dto.privateKey,
      dto.erc721Address,
      dto.tokenId,
      dto.amount,
      dto.cidV0,
    );
  }

  @Get('erc721/token-uri')
  getTokenURI(@Body() dto): Promise<any> {
    return this.erc721Service.getTokenURI(dto.erc721Address, dto.tokenId);
  }

  @Post('erc721/transfer')
  transferByNftOwner(@Body() dto): Promise<string> {
    return this.erc721Service.transferByNftOwner(
      dto.nftOwnerAccountAddress,
      dto.toAccountAddress,
      dto.privateKey,
      dto.erc721Address,
      dto.tokenId,
    );
  }
}
