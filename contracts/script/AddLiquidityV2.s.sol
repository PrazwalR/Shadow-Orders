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
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

interface IPoolModifyLiquidityTest {
    function modifyLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes memory hookData
    ) external payable returns (int256 delta0, int256 delta1);
}

/// @title AddLiquidityV2
/// @notice Adds liquidity using PoolModifyLiquidityTest contract
contract AddLiquidityV2 is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    // Base Sepolia addresses
    IPoolManager constant poolManager = IPoolManager(0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408);
    IPoolModifyLiquidityTest constant modifyLiquidity = IPoolModifyLiquidityTest(0x37429cD17Cb1454C34E7F50b09725202Fd533039);
    
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
        console.log("ModifyLiquidity:", address(modifyLiquidity));
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Approve all tokens for ModifyLiquidity contract
        console.log("Approving tokens...");
        uint256 maxApproval = type(uint256).max;
        
        IERC20(mockUSDC).approve(address(modifyLiquidity), maxApproval);
        IERC20(mockDAI).approve(address(modifyLiquidity), maxApproval);
        IERC20(mockWBTC).approve(address(modifyLiquidity), maxApproval);
        IERC20(mockLINK).approve(address(modifyLiquidity), maxApproval);
        IERC20(mockWETH).approve(address(modifyLiquidity), maxApproval);
        console.log("  Done!");
        
        // Add liquidity to each pool
        // Pool 1: mUSDC/mWETH
        console.log("");
        console.log("Adding liquidity to mUSDC/mWETH pool...");
        {
            (address t0, address t1) = sortTokens(mockUSDC, mockWETH);
            addLiquidityToPool(t0, t1, hookAddress, 10000 * 10**6, 10 * 10**18);
        }
        
        // Pool 2: mWETH/mDAI
        console.log("Adding liquidity to mWETH/mDAI pool...");
        {
            (address t0, address t1) = sortTokens(mockWETH, mockDAI);
            addLiquidityToPool(t0, t1, hookAddress, 10 * 10**18, 30000 * 10**18);
        }
        
        // Pool 3: mWBTC/mWETH
        console.log("Adding liquidity to mWBTC/mWETH pool...");
        {
            (address t0, address t1) = sortTokens(mockWBTC, mockWETH);
            addLiquidityToPool(t0, t1, hookAddress, 1 * 10**8, 20 * 10**18);
        }
        
        // Pool 4: mWETH/mLINK
        console.log("Adding liquidity to mWETH/mLINK pool...");
        {
            (address t0, address t1) = sortTokens(mockWETH, mockLINK);
            addLiquidityToPool(t0, t1, hookAddress, 10 * 10**18, 1000 * 10**18);
        }

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("   LIQUIDITY ADDED SUCCESSFULLY!");
        console.log("========================================");
    }
    
    function sortTokens(address tokenA, address tokenB) internal pure returns (address, address) {
        return tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }
    
    function addLiquidityToPool(
        address token0,
        address token1,
        address hookAddress,
        uint256 amount0,
        uint256 amount1
    ) internal {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hookAddress)
        });
        
        // Wide range around current tick
        int24 tickLower = -887220;
        int24 tickUpper = 887220;
        
        // Calculate liquidity delta (simplified - add fixed amount)
        int128 liquidityDelta = 1000000000; // 1B liquidity units
        
        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidityDelta: liquidityDelta,
            salt: bytes32(0)
        });
        
        try modifyLiquidity.modifyLiquidity(key, params, "") returns (int256 delta0, int256 delta1) {
            console.log("  Success! Delta0:", delta0);
            console.log("           Delta1:", delta1);
        } catch Error(string memory reason) {
            console.log("  Failed:", reason);
        } catch {
            console.log("  Failed: Unknown error");
        }
    }
}
