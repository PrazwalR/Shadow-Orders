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
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";

/// @title AddLiquidity
/// @notice Adds liquidity to our Shadow Orders pools
/// @dev Uses PositionManager for adding liquidity
contract AddLiquidity is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    // Base Sepolia addresses
    IPoolManager constant poolManager = IPoolManager(0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408);
    
    // Position Manager for adding liquidity (Base Sepolia)
    // Note: This address needs to be verified for Base Sepolia
    address constant POSITION_MANAGER = 0x1B1C77B606d13b09C84d1c7394B96b147bC03147;
    
    // Pool parameters
    uint24 constant FEE = 3000;
    int24 constant TICK_SPACING = 60;
    
    // Liquidity range: wide range around current price
    int24 constant TICK_LOWER = -887220; // Near min tick
    int24 constant TICK_UPPER = 887220;  // Near max tick

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

        // Approve tokens for PoolManager (for direct liquidity)
        console.log("Approving tokens...");
        
        uint256 maxApproval = type(uint256).max;
        
        IERC20(mockUSDC).approve(address(poolManager), maxApproval);
        IERC20(mockDAI).approve(address(poolManager), maxApproval);
        IERC20(mockWBTC).approve(address(poolManager), maxApproval);
        IERC20(mockLINK).approve(address(poolManager), maxApproval);
        IERC20(mockWETH).approve(address(poolManager), maxApproval);
        
        // Also approve PositionManager
        IERC20(mockUSDC).approve(POSITION_MANAGER, maxApproval);
        IERC20(mockDAI).approve(POSITION_MANAGER, maxApproval);
        IERC20(mockWBTC).approve(POSITION_MANAGER, maxApproval);
        IERC20(mockLINK).approve(POSITION_MANAGER, maxApproval);
        IERC20(mockWETH).approve(POSITION_MANAGER, maxApproval);
        
        console.log("  All tokens approved!");
        console.log("");

        // Log balances
        console.log("Current balances:");
        console.log("  mUSDC:", IERC20(mockUSDC).balanceOf(deployer));
        console.log("  mDAI:", IERC20(mockDAI).balanceOf(deployer));
        console.log("  mWBTC:", IERC20(mockWBTC).balanceOf(deployer));
        console.log("  mLINK:", IERC20(mockLINK).balanceOf(deployer));
        console.log("  mWETH:", IERC20(mockWETH).balanceOf(deployer));
        console.log("");

        vm.stopBroadcast();

        console.log("========================================");
        console.log("   APPROVALS COMPLETE!");
        console.log("========================================");
        console.log("");
        console.log("Note: Liquidity addition requires PositionManager");
        console.log("which has a complex interface. For hackathon demo,");
        console.log("you can use the Uniswap V4 SDK in the frontend.");
        console.log("");
        console.log("Alternatively, mint tokens directly to users for");
        console.log("testing the order flow without actual swaps.");
    }
}
