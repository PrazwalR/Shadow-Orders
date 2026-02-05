// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

interface IPoolModifyLiquidityTest {
    function modifyLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes memory hookData
    ) external payable returns (int256 delta0, int256 delta1);
}

/// @title AddLiquiditySimple
/// @notice Adds liquidity directly through PoolManager unlock callback
contract AddLiquiditySimple is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    // Base Sepolia addresses
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    address constant POOL_MODIFY_LIQUIDITY_TEST = 0x37429cD17Cb1454C34E7F50b09725202Fd533039;
    
    // Pool parameters
    uint24 constant FEE = 3000;
    int24 constant TICK_SPACING = 60;

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
        console.log("   SHADOW ORDERS - ADD LIQUIDITY");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Hook:", hookAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Approve all tokens for PoolModifyLiquidityTest contract
        console.log("Approving tokens...");
        uint256 maxApproval = type(uint256).max;
        
        IERC20(mockUSDC).approve(POOL_MODIFY_LIQUIDITY_TEST, maxApproval);
        IERC20(mockDAI).approve(POOL_MODIFY_LIQUIDITY_TEST, maxApproval);
        IERC20(mockWBTC).approve(POOL_MODIFY_LIQUIDITY_TEST, maxApproval);
        IERC20(mockLINK).approve(POOL_MODIFY_LIQUIDITY_TEST, maxApproval);
        IERC20(mockWETH).approve(POOL_MODIFY_LIQUIDITY_TEST, maxApproval);
        console.log("  Done!");
        
        // Add liquidity to Pool 1: mUSDC/mWETH
        console.log("");
        console.log("Adding liquidity to mUSDC/mWETH pool...");
        addLiquidityToPool(mockUSDC, mockWETH, hookAddress);
        
        // Add liquidity to Pool 2: mWETH/mDAI
        console.log("Adding liquidity to mWETH/mDAI pool...");
        addLiquidityToPool(mockWETH, mockDAI, hookAddress);
        
        // Add liquidity to Pool 3: mWBTC/mWETH
        console.log("Adding liquidity to mWBTC/mWETH pool...");
        addLiquidityToPool(mockWBTC, mockWETH, hookAddress);
        
        // Add liquidity to Pool 4: mWETH/mLINK
        console.log("Adding liquidity to mWETH/mLINK pool...");
        addLiquidityToPool(mockWETH, mockLINK, hookAddress);

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("   LIQUIDITY ADDED SUCCESSFULLY!");
        console.log("========================================");
    }
    
    function addLiquidityToPool(
        address tokenA,
        address tokenB,
        address hookAddress
    ) internal {
        // Sort tokens
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hookAddress)
        });
        
        // Tick range must be divisible by tick spacing (60)
        // Using a wide but valid range
        int24 tickLower = -887220; // MIN_TICK rounded to tick spacing
        int24 tickUpper = 887220;  // MAX_TICK rounded to tick spacing
        
        // Liquidity amount
        int128 liquidityDelta = 1000000000000; // 1T liquidity units
        
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidityDelta,
            salt: bytes32(0)
        });
        
        // Call modifyLiquidity through the test contract
        (bool success, ) = POOL_MODIFY_LIQUIDITY_TEST.call(
            abi.encodeWithSignature(
                "modifyLiquidity((address,address,uint24,int24,address),(int24,int24,int256,bytes32),bytes)",
                key,
                params,
                ""
            )
        );
        
        if (success) {
            console.log("  Success!");
        } else {
            console.log("  Failed - trying direct method");
            // Try the direct interface call
            IPoolModifyLiquidityTest(POOL_MODIFY_LIQUIDITY_TEST).modifyLiquidity(key, params, "");
            console.log("  Success via direct call!");
        }
    }
}
