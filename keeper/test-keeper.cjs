#!/usr/bin/env node
/**
 * Keeper Bot Function Test
 */

const { ethers } = require('ethers');
require('dotenv').config({ path: '../.env' });

async function test() {
    console.log('Testing Keeper Bot Functions After Update...');
    console.log('============================================\n');

    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.KEEPER_PRIVATE_KEY, provider);

    const hookAbi = [
        'function nextOrderId() view returns (uint256)',
        'function keeper() view returns (address)',
        'function orders(uint256) view returns (address owner, bytes32 limitPrice, bytes32 amount, bytes32 isBuyOrder, bool isActive, bytes32 poolId, uint256 createdAt)'
    ];

    const hook = new ethers.Contract(process.env.SHADOW_ORDERS_HOOK, hookAbi, wallet);

    console.log('Keeper wallet:', wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('Balance:', ethers.formatEther(balance), 'ETH');

    const nextOrderId = await hook.nextOrderId();
    console.log('nextOrderId:', nextOrderId.toString());

    const keeper = await hook.keeper();
    console.log('Contract keeper:', keeper);

    const match = keeper.toLowerCase() === wallet.address.toLowerCase();
    console.log('\n' + (match ? '✅ Keeper Match: YES' : '❌ Keeper Match: NO'));

    process.exit(match ? 0 : 1);
}

test().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
