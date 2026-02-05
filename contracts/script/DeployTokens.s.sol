// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

/// @title DeployTestTokens
/// @notice Deploys mock tokens and initializes pools for testing
contract DeployTestTokens is Script {
    using CurrencyLibrary for Currency;

    // Base Sepolia addresses
    address constant POOL_MANAGER = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;
    
    // Our hook address (already deployed)
    address public hookAddress;
    
    // Token addresses (will be set after deployment)
    MockERC20 public mockUSDC;
    MockERC20 public mockDAI;
    MockERC20 public mockWBTC;
    MockERC20 public mockLINK;
    MockERC20 public mockWETH;

    function run() external {
        // Load hook address from env
        hookAddress = vm.envAddress("SHADOW_ORDERS_HOOK");
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("========================================");
        console.log("   SHADOW ORDERS - TOKEN DEPLOYMENT");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Hook:", hookAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ============ DEPLOY MOCK TOKENS ============
        console.log("Deploying Mock Tokens...");
        
        // USDC - 6 decimals
        mockUSDC = new MockERC20("Mock USDC", "mUSDC", 6);
        console.log("  mUSDC deployed:", address(mockUSDC));
        
        // DAI - 18 decimals
        mockDAI = new MockERC20("Mock DAI", "mDAI", 18);
        console.log("  mDAI deployed:", address(mockDAI));
        
        // WBTC - 8 decimals
        mockWBTC = new MockERC20("Mock WBTC", "mWBTC", 8);
        console.log("  mWBTC deployed:", address(mockWBTC));
        
        // LINK - 18 decimals
        mockLINK = new MockERC20("Mock LINK", "mLINK", 18);
        console.log("  mLINK deployed:", address(mockLINK));
        
        // WETH - 18 decimals (our own for testing)
        mockWETH = new MockERC20("Mock WETH", "mWETH", 18);
        console.log("  mWETH deployed:", address(mockWETH));

        // ============ MINT INITIAL SUPPLY ============
        console.log("");
        console.log("Minting initial supply to deployer...");
        
        // Mint generous amounts for testing
        mockUSDC.mint(deployer, 1_000_000 * 10**6);     // 1M USDC
        mockDAI.mint(deployer, 1_000_000 * 10**18);     // 1M DAI
        mockWBTC.mint(deployer, 100 * 10**8);           // 100 WBTC
        mockLINK.mint(deployer, 100_000 * 10**18);      // 100K LINK
        mockWETH.mint(deployer, 1_000 * 10**18);        // 1000 WETH
        
        console.log("  Minted 1,000,000 mUSDC");
        console.log("  Minted 1,000,000 mDAI");
        console.log("  Minted 100 mWBTC");
        console.log("  Minted 100,000 mLINK");
        console.log("  Minted 1,000 mWETH");

        vm.stopBroadcast();

        // ============ OUTPUT SUMMARY ============
        console.log("");
        console.log("========================================");
        console.log("   TOKEN DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("");
        console.log("Add these to your .env:");
        console.log("");
        console.log("MOCK_USDC=", address(mockUSDC));
        console.log("MOCK_DAI=", address(mockDAI));
        console.log("MOCK_WBTC=", address(mockWBTC));
        console.log("MOCK_LINK=", address(mockLINK));
        console.log("MOCK_WETH=", address(mockWETH));
        console.log("");
    }
}
