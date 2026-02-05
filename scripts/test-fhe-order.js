#!/usr/bin/env node
/**
 * Real FHE Order Creation Test
 * Uses Inco JS SDK for proper ciphertext generation
 */

import { handleTypes, supportedChains } from '@inco/js';
import { Lightning } from '@inco/js/lite';
import { createWalletClient, createPublicClient, http, parseAbi, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuration
const config = {
    rpcUrl: process.env.BASE_SEPOLIA_RPC,
    hookAddress: process.env.SHADOW_ORDERS_HOOK,
    poolManager: process.env.POOL_MANAGER,
    privateKey: process.env.PRIVATE_KEY,
    keeperPrivateKey: process.env.KEEPER_PRIVATE_KEY,
    keeperAddress: process.env.KEEPER_ADDRESS,
    incoSingleton: '0x168FDc3Ae19A5d5b03614578C58974FF30FCBe92'
};

// Hook ABI
const hookAbi = parseAbi([
    'function nextOrderId() view returns (uint256)',
    'function keeper() view returns (address)',
    'function KEEPER_FEE_BPS() view returns (uint256)',
    'function orders(uint256) view returns (address owner, bytes32 limitPrice, bytes32 amount, bytes32 isBuyOrder, bool isActive, bytes32 poolId, uint256 createdAt)',
    'function createOrder(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bytes limitPriceInput, bytes amountInput, bytes isBuyOrderInput) payable returns (uint256 orderId)',
    'function cancelOrder(uint256 orderId)',
    'event OrderCreated(uint256 indexed orderId, address indexed owner, bytes32 indexed poolId, uint256 createdAt)',
    'event OrderCancelled(uint256 indexed orderId, address indexed owner)'
]);

const incoAbi = parseAbi([
    'function getFee() view returns (uint256)'
]);

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     SHADOW ORDERS - FHE ORDER CREATION TEST                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Setup account from private key
    const account = privateKeyToAccount(config.privateKey);
    console.log(`Account: ${account.address}`);

    // Setup Viem clients
    const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl)
    });

    const walletClient = createWalletClient({
        account,
        chain: baseSepolia,
        transport: http(config.rpcUrl)
    });

    // Check balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Balance: ${formatEther(balance)} ETH\n`);

    // Get FHE fee
    const fheFee = await publicClient.readContract({
        address: config.incoSingleton,
        abi: incoAbi,
        functionName: 'getFee'
    });
    console.log(`FHE Fee per operation: ${formatEther(fheFee)} ETH`);
    console.log(`Required for createOrder (3 ops): ${formatEther(fheFee * 3n)} ETH\n`);

    // Initialize Inco Lightning
    console.log('Initializing Inco Lightning SDK...');
    const chainId = supportedChains.baseSepolia;
    const zap = await Lightning.latest('testnet', chainId);
    console.log('✓ Inco Lightning initialized\n');

    // Test pool key (using ETH/WETH pair for Base Sepolia)
    const testPoolKey = {
        currency0: '0x0000000000000000000000000000000000000000', // ETH
        currency1: '0x4200000000000000000000000000000000000006', // WETH on Base
        fee: 3000,
        tickSpacing: 60,
        hooks: config.hookAddress
    };

    console.log('Pool Key:');
    console.log(`  currency0: ${testPoolKey.currency0}`);
    console.log(`  currency1: ${testPoolKey.currency1}`);
    console.log(`  fee: ${testPoolKey.fee} (${testPoolKey.fee / 10000}%)`);
    console.log(`  tickSpacing: ${testPoolKey.tickSpacing}`);
    console.log(`  hooks: ${testPoolKey.hooks}\n`);

    // Encrypt values using Inco SDK
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ENCRYPTING VALUES WITH INCO FHE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Encrypt limit price (100 * 10^18 for price in wei)
        const limitPrice = parseEther('100'); // 100 tokens limit price
        console.log(`\nEncrypting limitPrice: ${formatEther(limitPrice)}...`);

        const encryptedLimitPrice = await zap.encrypt(limitPrice, {
            accountAddress: account.address,
            dappAddress: config.hookAddress,
            handleType: handleTypes.euint256,
        });
        console.log(`✓ Encrypted limitPrice: ${encryptedLimitPrice.slice(0, 66)}...`);

        // Encrypt amount (1 token)
        const amount = parseEther('1'); // 1 token
        console.log(`\nEncrypting amount: ${formatEther(amount)}...`);

        const encryptedAmount = await zap.encrypt(amount, {
            accountAddress: account.address,
            dappAddress: config.hookAddress,
            handleType: handleTypes.euint256,
        });
        console.log(`✓ Encrypted amount: ${encryptedAmount.slice(0, 66)}...`);

        // Encrypt isBuyOrder (true = buy)
        const isBuyOrder = true;
        console.log(`\nEncrypting isBuyOrder: ${isBuyOrder}...`);

        const encryptedIsBuyOrder = await zap.encrypt(isBuyOrder, {
            accountAddress: account.address,
            dappAddress: config.hookAddress,
            handleType: handleTypes.ebool,
        });
        console.log(`✓ Encrypted isBuyOrder: ${encryptedIsBuyOrder.slice(0, 66)}...`);

        // Create order
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('CREATING ORDER ON-CHAIN');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const requiredValue = fheFee * 3n;
        console.log(`\nSending transaction with value: ${formatEther(requiredValue)} ETH`);

        // Simulate first
        console.log('Simulating transaction...');
        const { request } = await publicClient.simulateContract({
            address: config.hookAddress,
            abi: hookAbi,
            functionName: 'createOrder',
            args: [
                testPoolKey,
                encryptedLimitPrice,
                encryptedAmount,
                encryptedIsBuyOrder
            ],
            value: requiredValue,
            account
        });
        console.log('✓ Simulation successful');

        // Execute transaction
        console.log('Sending transaction...');
        const hash = await walletClient.writeContract(request);
        console.log(`Transaction hash: ${hash}`);

        // Wait for confirmation
        console.log('Waiting for confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        if (receipt.status === 'success') {
            console.log(`\n✅ ORDER CREATED SUCCESSFULLY!`);
            console.log(`Block: ${receipt.blockNumber}`);
            console.log(`Gas used: ${receipt.gasUsed}`);

            // Get new order ID
            const newOrderId = await publicClient.readContract({
                address: config.hookAddress,
                abi: hookAbi,
                functionName: 'nextOrderId'
            });
            console.log(`\nNew nextOrderId: ${newOrderId}`);
            console.log(`Created orderId: ${newOrderId - 1n}`);

            // Query the order
            const order = await publicClient.readContract({
                address: config.hookAddress,
                abi: hookAbi,
                functionName: 'orders',
                args: [newOrderId - 1n]
            });
            console.log(`\nOrder details:`);
            console.log(`  owner: ${order[0]}`);
            console.log(`  isActive: ${order[4]}`);
            console.log(`  createdAt: ${new Date(Number(order[6]) * 1000).toISOString()}`);
        } else {
            console.log(`\n❌ Transaction failed`);
        }

    } catch (err) {
        console.log(`\n❌ ERROR: ${err.message}`);
        if (err.cause) {
            console.log(`Cause: ${JSON.stringify(err.cause, null, 2)}`);
        }
        if (err.shortMessage) {
            console.log(`Short message: ${err.shortMessage}`);
        }
        console.log('\nFull error:', err);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
