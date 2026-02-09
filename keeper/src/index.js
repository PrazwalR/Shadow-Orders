import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const HOOK_ABI = [
    'event OrderCreated(uint256 indexed orderId, address indexed owner, bytes32 indexed poolId, uint256 createdAt)',
    'function checkOrderExecutable(uint256 orderId, uint256 currentPrice) external returns (bool)',
    'function executeOrder(uint256 orderId, uint256 currentPrice) external',
    'function orders(uint256) external view returns (address owner, uint256 limitPrice, uint256 amount, uint256 isBuyOrder, bool isActive, bytes32 poolId, uint256 createdAt)',
    'function nextOrderId() external view returns (uint256)'
];

// Use the deployed contract addresses
const HOOK_ADDRESS = process.env.SHADOW_ORDERS_HOOK_ADDRESS || '0x18a398ec7893303Ee3fe2d64D98Edd806C6D80c4';
const POOL_MANAGER_ADDRESS = process.env.POOL_MANAGER_ADDRESS || '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408';
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;

// Demo mode - simulated prices
const DEMO_MODE = true;
const SIMULATED_PRICES = {
    'ETH': 3000, // $3000 per ETH
    'USDC': 1    // $1 per USDC
};

class KeeperBot {
    constructor() {
        if (!KEEPER_PRIVATE_KEY) {
            throw new Error('❌ KEEPER_PRIVATE_KEY environment variable is required');
        }

        this.provider = new ethers.JsonRpcProvider(RPC_URL);
        this.wallet = new ethers.Wallet(KEEPER_PRIVATE_KEY, this.provider);
        this.hook = new ethers.Contract(HOOK_ADDRESS, HOOK_ABI, this.wallet);
        this.activeOrders = new Set();

        console.log('🤖 Shadow Orders Keeper Bot');
        console.log('============================');
        console.log('Mode:', DEMO_MODE ? '🎮 DEMO' : '🔴 LIVE');
        console.log('Keeper:', this.wallet.address);
        console.log('Hook:', HOOK_ADDRESS);
        console.log('RPC:', RPC_URL);
        console.log('============================\n');
    }

    async start() {
        console.log('⏳ Starting keeper bot...\n');

        // Load existing orders
        await this.loadExistingOrders();

        // Listen for new orders
        this.hook.on('OrderCreated', (orderId, owner, poolId, createdAt) => {
            console.log(`📝 New order created: #${orderId}`);
            console.log(`   Owner: ${owner}`);
            console.log(`   Pool: ${poolId}`);
            this.activeOrders.add(orderId.toString());
        });

        // Monitor orders every 12 seconds (Base block time)
        setInterval(() => this.monitorOrders(), 12000);

        console.log('✅ Keeper bot running...\n');
    }

    async loadExistingOrders() {
        try {
            const nextOrderId = await this.hook.nextOrderId();
            console.log(`📊 Loading orders... (0 to ${nextOrderId - 1n})`);

            for (let i = 0; i < nextOrderId; i++) {
                const order = await this.hook.orders(i);
                if (order.isActive) {
                    this.activeOrders.add(i.toString());
                    console.log(`   ✓ Order #${i} is active`);
                }
            }

            console.log(`\n✅ Loaded ${this.activeOrders.size} active orders\n`);
        } catch (error) {
            console.error('Error loading orders:', error.message);
        }
    }

    async monitorOrders() {
        if (this.activeOrders.size === 0) return;

        console.log(`🔍 Monitoring ${this.activeOrders.size} orders...`);

        for (const orderId of this.activeOrders) {
            try {
                await this.checkAndExecute(orderId);
            } catch (error) {
                console.error(`Error checking order #${orderId}:`, error.message);
            }
        }
    }

    async checkAndExecute(orderId) {
        // Get simulated price (in demo mode, use 3000e18 for ETH/USDC pool)
        const currentPrice = DEMO_MODE ? ethers.parseUnits('3000', 18) : await this.getOraclePrice();

        try {
            // Check if order is executable (FHE validation on-chain)
            const isExecutable = await this.hook.checkOrderExecutable(orderId, currentPrice);

            if (isExecutable) {
                console.log(`\n🎯 Order #${orderId} is executable at price ${ethers.formatUnits(currentPrice, 18)}`);
                console.log('   Executing order...');

                const tx = await this.hook.executeOrder(orderId, currentPrice, {
                    gasLimit: 500000
                });

                console.log(`   TX: ${tx.hash}`);
                const receipt = await tx.wait();

                console.log(`   ✅ Order executed! Gas used: ${receipt.gasUsed}`);
                this.activeOrders.delete(orderId);
            }
        } catch (error) {
            if (error.message.includes('OrderNotExecutable')) {
                // Order not ready yet - this is normal
            } else if (error.message.includes('OrderNotActive')) {
                // Order was cancelled or already executed
                this.activeOrders.delete(orderId);
                console.log(`   ℹ️  Order #${orderId} no longer active`);
            } else {
                console.error(`   ❌ Error: ${error.message}`);
            }
        }
    }

    async getOraclePrice() {
        // In production, fetch from CoinGecko or Chainlink
        // For demo, use simulated price with some variance
        const basePrice = SIMULATED_PRICES.ETH;
        const variance = (Math.random() - 0.5) * 100; // ±$50
        return ethers.parseUnits((basePrice + variance).toFixed(2), 18);
    }
}

// Start the keeper
const keeper = new KeeperBot();
keeper.start().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down keeper bot...');
    process.exit(0);
});
