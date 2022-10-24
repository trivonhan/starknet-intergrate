import * as fs from 'fs';

// Install the latest version of starknet with npm install starknet@next and import starknet
import {
  Account,
  Contract,
  defaultProvider,
  ec,
  json,
  Provider,
  number,
} from 'starknet';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { bnToUint256 } from 'starknet/utils/uint256';
import { encodeShortString } from 'starknet/utils/shortString';

import * as path from 'path';
import { toFelt, toHex } from 'starknet/utils/number';
import { hex2ascii, hexArrayToString, stringToFelt } from './utils';
import { OZAccountDto } from './dto/oz-account.dto';

const compiledOZAccount = json.parse(
  fs
    .readFileSync(path.join(__dirname + '/contracts/OZAccount.json'))
    .toString('ascii'),
);
const compiledErc721 = json.parse(
  fs
    .readFileSync(path.join(__dirname, '/contracts/ERC721.json'))
    .toString('ascii'),
);

const provider =
  process.env.STARKNET_PROVIDER_BASE_URL === undefined
    ? defaultProvider
    : new Provider({
        sequencer: { baseUrl: process.env.STARKNET_PROVIDER_BASE_URL },
      });

@Injectable()
export class ERC721Service implements OnModuleInit {
  async onModuleInit() {}

  async createOZAccount(): Promise<OZAccountDto> {
    console.log('Reading OpenZeppelin Account Contract...');
    // Since there are no Externally Owned Accounts (EOA) in StarkNet,
    // all Accounts in StarkNet are contracts.

    // Unlike in Ethereum where a account is created with a public and private key pair,
    // StarkNet Accounts are the only way to sign transactions and messages, and verify signatures.
    // Therefore a Account - Contract interface is needed.

    // Generate public and private key pair.
    // const privateKey = stark.randomAddress();
    // const privateKey = process.env.AGENTX_PRIVATE_KEY;

    const starkKeyPair = ec.genKeyPair();
    const starkKeyPub = ec.getStarkKey(starkKeyPair);

    // // Deploy the Account contract and wait for it to be verified on StarkNet.
    console.log('Deployment Tx - Account Contract to StarkNet...');
    const accountResponse = await provider.deployContract({
      contract: compiledOZAccount,
      constructorCalldata: [starkKeyPub],
      addressSalt: starkKeyPub,
    });

    // You can also check this address on https://goerli.voyager.online/
    console.log('Account address ', accountResponse.contract_address);

    // Wait for the deployment transaction to be accepted on StarkNet
    console.log(
      'Waiting for Tx to be Accepted on Starknet - OpenZeppelin Account Deployment...',
    );
    await provider.waitForTransaction(accountResponse.transaction_hash);
    console.log('OpenZeppelin Account Contract Deployed');
    return {
      accountAddress: accountResponse.contract_address,
      privateKey: '0x' + starkKeyPair.getPrivate('hex'),
    };
  }

  /**
   * Function set token URI after mint by the account contract that owns this ERC721 contract
   *
   * @param ownerContractAddress - the OZ contract address that will be the ovner of ERC721 contract
   * @returns ERC721 contract address
   *
   */
  async deployERC721(ownerContractAddress: string): Promise<string> {
    console.log('Reading ERC721 Contract...');

    // Deploy an ERC20 contract and wait for it to be verified on StarkNet.
    console.log('Deployment Tx - ERC721 Contract to StarkNet...');
    console.log('Owner Contract Address: ', ownerContractAddress);
    const constructorData = [
      encodeShortString('CodelightNFT'),
      encodeShortString('CFT'),
      ownerContractAddress,
    ];
    const erc721Response = await provider.deployContract({
      contract: compiledErc721,
      constructorCalldata: constructorData,
    });

    console.log('ERC721 address ', erc721Response.contract_address);
    // Wait for the deployment transaction to be accepted on StarkNet
    console.log(
      'Waiting for Tx to be Accepted on Starknet - ERC721 Deployment...',
    );
    await defaultProvider.waitForTransaction(erc721Response.transaction_hash);
    console.log('ERC721 Contract Deployed');

    return erc721Response.contract_address;
  }

  async getNameContract(erc721Address): Promise<string> {
    console.log('Reading ERC721 Contract...');

    // Create a new erc20 contract object
    const erc721 = new Contract(compiledErc721.abi, erc721Address);

    console.log(`Invoke Tx - Getting name of contract `);
    const name = await erc721.name([]);
    console.log('Name: ', toHex(name.name));

    return hex2ascii(toHex(name.name));
  }

  /**
   * Function set token URI after mint by the account contract that owns this ERC721 contract
   *
   * @param privateKey - private key of the Openzeppline account contract
   * @param accountContract - the Openzeppline account contract address (master account contract) which is the owner of ERC721 contract
   * @param erc721Address - the ERC721 contract address
   * @param tokenId - Token ID
   * @param mintTo - the target Openzeppline account contract address that will own this NFT
   */
  async mintAndSetTokenURI(
    privateKey: string,
    accountContract: string,
    erc721Address: string,
    tokenId: number,
    mintTo: string,
  ): Promise<any> {
    console.log('Reading ERC721 Contract...');
    const starkKeyPair = ec.getKeyPair(privateKey);
    // Use your new account address
    const account = new Account(provider, accountContract, starkKeyPair);

    // Create a new erc20 contract object
    const erc721 = new Contract(compiledErc721.abi, erc721Address, provider);
    erc721.connect(account);
    //  erc20.connect();
    const tokenIdUint = bnToUint256(tokenId);
    console.log(`Invoke Tx - Minting 1000 tokens to `);
    const mintResponse = await erc721.mint(mintTo, [
      tokenIdUint.low,
      tokenIdUint.high,
    ]);

    // Wait for the transaction to be accepted on StarkNet
    console.log('Waiting for Tx to be Accepted on Starknet...');
    await defaultProvider.waitForTransaction(mintResponse.transaction_hash);
    console.log('Minted');
    const setTokenURIResponse = await erc721.setTokenURI(
      [tokenIdUint.low, tokenIdUint.high],
      [
        '143869255004888580070695465572066180332169606375711487424357321818787707482',
        '374968695587543135438736105477076850',
      ],
    );
    console.log('Waiting for Tx to be Accepted on Starknet...');
    await defaultProvider.waitForTransaction(
      setTokenURIResponse.transaction_hash,
    );
    console.log('Token URI Set');

    return mintResponse.transaction_hash;
  }

  /**
   * Function set token URI after mint by the account contract that owns this ERC721 contract
   *
   * @param privateKey - private key of the Openzeppline account contract
   * @param accountContract - the Openzeppline account contract address (master account contract) which is the owner of ERC721 contract
   * @param erc721Address - the ERC721 contract address
   * @param tokenID - Token ID
   * @param amount - amount of token to mint
   * @param mintTo - the target Openzeppline account contract address that will own this NFT
   */
  async mintWithOwner(
    privateKey: string,
    accountContract: string,
    erc721Address: string,
    tokenId: number,
    amount: number,
    mintTo: string,
  ): Promise<string> {
    console.log('Reading Account Contract...');
    const starkKeyPair = ec.getKeyPair(privateKey);

    //  Use your new account address
    const myAccount = new Account(
      defaultProvider,
      accountContract,
      starkKeyPair,
    );

    //prepair calldata
    const calls = [];

    for (let index = 0; index < amount; index++) {
      const uintTokenId = bnToUint256(tokenId + index);
      console.log('uintTokenId', uintTokenId);
      calls.push({
        contractAddress: erc721Address,
        entrypoint: 'mint',
        calldata: [number.toFelt(mintTo), uintTokenId.low, uintTokenId.high],
      });
    }

    console.log(`Invoke Tx - mint token back to erc721 contract...`);

    const { transaction_hash: transferTxHash } = await myAccount.execute(calls);

    console.log(`Waiting for Tx to be Accepted on Starknet - Mint...`);
    console.log('hash >>: ', transferTxHash);
    await defaultProvider.waitForTransaction(transferTxHash);

    console.log(`Tx was Accepted on Starknet - successful!`);

    return transferTxHash;
  }

  /**
   * Function burns token
   *
   * @param nftOnwerAccAdr - the Openzeppline account contract address which is the owner of the NFT
   * @param privateKey - private key of the Openzeppline account contract
   * @param erc721Address - the ERC721 contract address
   * @param tokenId - Token ID
   */
  async burnToken(
    nftOnwerAccAdr: string,
    privateKey: string,
    erc721Address: string,
    tokenId: number,
  ): Promise<string> {
    console.log('Reading Argent Account Contract...');
    const starkKeyPair = ec.getKeyPair(privateKey);

    //  Use your new account address
    const myAccount = new Account(
      defaultProvider,
      nftOnwerAccAdr,
      starkKeyPair,
    );

    const uintTokenId = bnToUint256(tokenId);

    const calls = [
      {
        contractAddress: erc721Address,
        entrypoint: 'burn',
        calldata: [uintTokenId.low, uintTokenId.high],
      },
    ];

    console.log(`Invoke Tx - Delete NFT...`);

    const { transaction_hash: transferTxHash } = await myAccount.execute(calls);

    console.log(`Waiting for Tx to be Accepted on Starknet - Burn token...`);
    console.log('hash >>: ', transferTxHash);
    await defaultProvider.waitForTransaction(transferTxHash);

    console.log(`Tx was Accepted on Starknet - successful!`);

    return transferTxHash;
  }

  /**
   * Function set token URI after mint by the account contract that owns this ERC721 contract
   *
   * @param accountContract - the Openzeppline account contract (master account contract) which is the owner of ERC721 contract
   * @param privateKey - private key of the Openzeppline account contract
   * @param erc721Address - the ERC721 contract address
   * @param tokenId - Token ID
   * @param cidV0 - Token URI
   *
   */
  async setTokenURI(
    accountContract: string,
    privateKey: string,
    erc721Address: string,
    tokenId: number,
    amount: number,
    cidV0: string,
  ): Promise<string> {
    console.log('Reading Argent Account Contract...');
    const starkKeyPair = ec.getKeyPair(privateKey);

    const tokenURI = stringToFelt(cidV0);
    console.log('tokenURI', tokenURI);

    //  Use your new account address
    const myAccount = new Account(
      defaultProvider,
      accountContract,
      starkKeyPair,
    );

    // console.log("nonce: ", toBN(await myAccount.getNonce()));

    console.log('contract address: ', myAccount.address);

    const calls = [];

    for (let index = 0; index < amount; index++) {
      const uintTokenId = bnToUint256(tokenId + index);
      const callData = [
        uintTokenId.low,
        uintTokenId.high,
        toFelt(tokenURI.length),
        ...tokenURI,
      ];
      calls.push({
        contractAddress: erc721Address,
        entrypoint: 'setTokenURI',
        calldata: callData,
      });
    }

    console.log('calls', calls);

    console.log(`Invoke Tx - Set token URI for token...`);

    const { transaction_hash: transferTxHash } = await myAccount.execute(calls);

    console.log(`Waiting for Tx to be Accepted on Starknet - Set Token URI...`);
    console.log('hash >>: ', transferTxHash);
    await defaultProvider.waitForTransaction(transferTxHash);

    console.log(`Tx was Accepted on Starknet - successful!`);

    return transferTxHash;
  }

  /**
   * Function get token URI
   *
   * @param erc721Address - the ERC721 contract address
   * @param tokenId - Token ID
   *
   */
  async getTokenURI(erc721Address: string, tokenId: number): Promise<object> {
    console.log('Reading ERC721 Contract...');

    const uintTokenId = bnToUint256(tokenId);

    // Create a new erc721 contract object
    const erc721 = new Contract(compiledErc721.abi, erc721Address);

    console.log(`Invoke Tx - Getting Token URI...`);
    const tokenURI = await erc721.tokenURI([uintTokenId.low, uintTokenId.high]);
    const tokenURIString = hexArrayToString(tokenURI.token_uri);
    return tokenURIString;
  }

  /**
   * Function set token URI after mint by the account contract that owns this ERC721 contract
   *
   * @param nftOwnerAccountAddress - the Openzeppline account contract address which is the owner of the NFT
   * @param toAccountAddress - the target account address that will receive the NFT
   * @param privateKey - private key of the Openzeppline account contract
   * @param erc721Address - the ERC721 contract address
   * @param tokenId - Token ID
   *
   *
   */
  async transferByNftOwner(
    nftOwnerAccountAddress: string,
    toAccountAddress: string,
    privateKey: string,
    erc721Address: string,
    tokenId: number,
  ): Promise<string> {
    console.log('Reading Argent Account Contract...');
    const starkKeyPair = ec.getKeyPair(privateKey);

    //  Use your new account address
    const myAccount = new Account(
      defaultProvider,
      nftOwnerAccountAddress,
      starkKeyPair,
    );

    //  // Mint 1000 tokens to accountContract address
    const uintTokenId = bnToUint256(tokenId);

    const calls = [
      {
        contractAddress: erc721Address,
        entrypoint: 'transferFrom',
        calldata: [
          nftOwnerAccountAddress,
          toAccountAddress,
          uintTokenId.low,
          uintTokenId.high,
        ],
      },
    ];

    console.log(`Invoke Tx - mint token back to erc721 contract...`);

    const { transaction_hash: transferTxHash } = await myAccount.execute(calls);

    console.log(`Waiting for Tx to be Accepted on Starknet - Transfer...`);
    console.log('hash >>: ', transferTxHash);
    await defaultProvider.waitForTransaction(transferTxHash);

    console.log(`Tx was Accepted on Starknet - successful!`);

    return transferTxHash;
  }

  async ownerMultiCall(
    privateKey: string,
    accountContract: string,
    calls: any[],
  ): Promise<string> {
    console.log('Reading Account Contract...');
    const starkKeyPair = ec.getKeyPair(privateKey);

    //  Use your new account address
    const myAccount = new Account(
      defaultProvider,
      accountContract,
      starkKeyPair,
    );

    console.log(`Invoke Tx - mint token back to erc721 contract...`);

    const { transaction_hash: transferTxHash } = await myAccount.execute(calls);

    console.log(`Waiting for Tx to be Accepted on Starknet - Multicall...`);
    console.log('hash >>: ', transferTxHash);
    await defaultProvider.waitForTransaction(transferTxHash);

    console.log(`Tx was Accepted on Starknet - successful!`);

    return transferTxHash;
  }
}
