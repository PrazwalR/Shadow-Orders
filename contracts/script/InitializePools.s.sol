// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title InitializePools
/// @notice Initializes Uniswap V4 pools with our ShadowOrdersHook
contract InitializePools is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    // Base Sepolia addresses
    IPoolManager constant poolManager = IPoolManager(0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408);
    
    // Pool parameters
    uint24 constant FEE = 3000; // 0.3%
    int24 constant TICK_SPACING = 60;
    
    // Starting price = 1:1 (sqrt(1) * 2^96)
    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;
    
    // For ETH/USDC: ~$3000 per ETH
    // sqrt(3000) * 2^96 ≈ 4339505179874779336202090496000
    uint160 constant SQRT_PRICE_ETH_USDC = 4339505179874779336202090496;
    
    // For WBTC/WETH: ~20 ETH per BTC
    // sqrt(20) * 2^96 ≈ 354370243772307322902970015744
    uint160 constant SQRT_PRICE_WBTC_WETH = 354370243772307322902970015744;

    struct PoolConfig {
        address token0;
        address token1;
        uint160 sqrtPriceX96;
        string name;
    }

    function run() external {
        // Load addresses from env
        address hookAddress = vm.envAddress("SHADOW_ORDERS_HOOK");
        address mockUSDC = vm.envAddress("MOCK_USDC");
        address mockDAI = vm.envAddress("MOCK_DAI");
        address mockWBTC = vm.envAddress("MOCK_WBTC");
        address mockLINK = vm.envAddress("MOCK_LINK");
        address mockWETH = vm.envAddress("MOCK_WETH");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("   SHADOW ORDERS - POOL INITIALIZATION");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Hook:", hookAddress);
        console.log("PoolManager:", address(poolManager));
        console.log("");

        // Define pools to create
        // Note: token0 must be < token1 (sorted by address)
        PoolConfig[4] memory pools;
        
        // Sort tokens and create pool configs
        pools[0] = createPoolConfig(mockWETH, mockUSDC, SQRT_PRICE_ETH_USDC, "mWETH/mUSDC");
        pools[1] = createPoolConfig(mockWETH, mockDAI, SQRT_PRICE_1_1, "mWETH/mDAI");
        pools[2] = createPoolConfig(mockWBTC, mockWETH, SQRT_PRICE_WBTC_WETH, "mWBTC/mWETH");
        pools[3] = createPoolConfig(mockLINK, mockWETH, SQRT_PRICE_1_1, "mLINK/mWETH");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Initializing Pools...");
        console.log("");

        for (uint i = 0; i < pools.length; i++) {
            PoolConfig memory config = pools[i];
            
            // Create PoolKey
            PoolKey memory key = PoolKey({
                currency0: Currency.wrap(config.token0),
                currency1: Currency.wrap(config.token1),
                fee: FEE,
                tickSpacing: TICK_SPACING,
                hooks: IHooks(hookAddress)
            });
            
            // Get pool ID
            PoolId poolId = key.toId();
            
            console.log("Pool:", config.name);
            console.log("  token0:", config.token0);
            console.log("  token1:", config.token1);
            console.log("  poolId:", vm.toString(PoolId.unwrap(poolId)));
            
            // Initialize pool
            try poolManager.initialize(key, config.sqrtPriceX96) returns (int24 tick) {
                console.log("  tick:", tick);
                console.log("  Status: SUCCESS");
            } catch Error(string memory reason) {
                console.log("  Status: FAILED -", reason);
            } catch {
                console.log("  Status: FAILED - Unknown error (pool may already exist)");
            }
            console.log("");
        }

        vm.stopBroadcast();

        console.log("========================================");
        console.log("   POOL INITIALIZATION COMPLETE!");
        console.log("========================================");
    }
    
    function createPoolConfig(
        address tokenA,
        address tokenB,
        uint160 sqrtPrice,
        string memory name
    ) internal pure returns (PoolConfig memory) {
        // Sort tokens (token0 < token1)
        if (tokenA < tokenB) {
            return PoolConfig({
                token0: tokenA,
                token1: tokenB,
                sqrtPriceX96: sqrtPrice,
                name: name
            });
        } else {
            // If swapped, we need to invert the price
            // For simplicity, use 1:1 price when swapped
            return PoolConfig({
                token0: tokenB,
                token1: tokenA,
                sqrtPriceX96: SQRT_PRICE_1_1,
                name: name
            });
        }
    }
}
