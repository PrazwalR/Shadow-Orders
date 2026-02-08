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

interface IMockERC20 {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPoolModifyLiquidityTest {
    function modifyLiquidity(
        PoolKey memory key,
        ModifyLiquidityParams memory params,
        bytes memory hookData
    ) external payable returns (bytes32 delta);
}

/// @title BoostLiquidity
/// @notice Mints tokens and adds substantial liquidity to all Shadow Orders pools
/// @dev Run with: forge script script/BoostLiquidity.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast
contract BoostLiquidity is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    IPoolModifyLiquidityTest constant modifyLiquidity = IPoolModifyLiquidityTest(0x37429cD17Cb1454C34E7F50b09725202Fd533039);
    
    uint24 constant FEE = 3000;
    int24 constant TICK_SPACING = 60;

    function run() external {
        address hookAddress = vm.envAddress("SHADOW_ORDERS_HOOK_ADDRESS");
        address mockUSDC = vm.envAddress("MOCK_USDC");
        address mockDAI = vm.envAddress("MOCK_DAI");
        address mockWBTC = vm.envAddress("MOCK_WBTC");
        address mockWETH = vm.envAddress("MOCK_WETH");
        
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("   BOOST LIQUIDITY FOR SHADOW ORDERS");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Hook:", hookAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Mint a LOT of tokens to deployer
        // Full-range liquidity at 18 decimals: L=1e20 ≈ 100 tokens each side
        // For 6-decimal USDC: L=1e10 ≈ 10,000 USDC, L=1e11 ≈ 100K USDC
        console.log("Minting tokens...");
        uint256 usdcMint = 1_000_000_000 * 10**6;     // 1B USDC (enough for large L)
        uint256 wethMint = 100_000 * 10**18;           // 100K WETH
        uint256 daiMint  = 100_000 * 10**18;           // 100K DAI
        uint256 wbtcMint = 10_000 * 10**8;             // 10K WBTC
        
        IMockERC20(mockUSDC).mint(deployer, usdcMint);
        IMockERC20(mockWETH).mint(deployer, wethMint);
        IMockERC20(mockDAI).mint(deployer, daiMint);
        IMockERC20(mockWBTC).mint(deployer, wbtcMint);
        console.log("  Minted 1B mUSDC, 100K mWETH, 100K mDAI, 10K mWBTC");

        // Step 2: Approve PoolModifyLiquidityTest
        console.log("Approving tokens...");
        uint256 maxApproval = type(uint256).max;
        IMockERC20(mockUSDC).approve(address(modifyLiquidity), maxApproval);
        IMockERC20(mockWETH).approve(address(modifyLiquidity), maxApproval);
        IMockERC20(mockDAI).approve(address(modifyLiquidity), maxApproval);
        IMockERC20(mockWBTC).approve(address(modifyLiquidity), maxApproval);
        console.log("  Done!");

        // Step 3: Add liquidity with pool-specific liquidityDelta values
        // Full-range liquidity: amount ≈ L for each token side (simplified)
        // 18-decimal tokens: L=1e20 ≈ 100 tokens each side 
        // 6-decimal tokens need much smaller L at same price
        // 8-decimal tokens: intermediate

        // Pool 1: mUSDC/mWETH — USDC is 6 dec, WETH is 18 dec
        // At price ~2000 USDC/ETH, use L=5e10 → ~50K USDC + proportional WETH
        console.log("");
        console.log("Adding liquidity to mUSDC/mWETH...");
        {
            (address t0, address t1) = sortTokens(mockUSDC, mockWETH);
            addLiq(t0, t1, hookAddress, 50_000_000_000); // 5e10
        }

        // Pool 2: mWETH/mDAI — both 18 dec, price=1
        // L=1e20 → ~100 tokens each
        console.log("Adding liquidity to mWETH/mDAI...");
        {
            (address t0, address t1) = sortTokens(mockWETH, mockDAI);
            addLiq(t0, t1, hookAddress, 100_000_000_000_000_000_000); // 1e20
        }

        // Pool 3: mWBTC/mWETH — WBTC is 8 dec, WETH is 18 dec
        // At price ~30 WETH/BTC, use L=1e12 → moderate amounts
        console.log("Adding liquidity to mWBTC/mWETH...");
        {
            (address t0, address t1) = sortTokens(mockWBTC, mockWETH);
            addLiq(t0, t1, hookAddress, 1_000_000_000_000); // 1e12
        }

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("   LIQUIDITY BOOST COMPLETE!");
        console.log("========================================");
    }

    function sortTokens(address a, address b) internal pure returns (address, address) {
        return a < b ? (a, b) : (b, a);
    }

    function addLiq(address token0, address token1, address hookAddress, int256 liq) internal {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hookAddress)
        });

        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: -887220,
            tickUpper: 887220,
            liquidityDelta: liq,
            salt: bytes32(0)
        });

        modifyLiquidity.modifyLiquidity(key, params, "");
        console.log("  Success!");
    }
}
