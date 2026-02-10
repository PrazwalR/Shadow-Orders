// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ShadowOrdersHook} from "../src/ShadowOrdersHook.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

/// @title Test Script - Create Sample Order
contract CreateTestOrder is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address hookAddress = vm.envAddress("SHADOW_ORDERS_HOOK");
        
        console.log("Creating test order...");
        console.log("Hook:", hookAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        ShadowOrdersHook hook = ShadowOrdersHook(payable(hookAddress));
        
        // Create a dummy pool key (ETH/USDC example)
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(0)), // ETH
            currency1: Currency.wrap(address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)), // USDC placeholder
            fee: 3000, // 0.3%
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });
        
        bytes memory limitPrice = abi.encodePacked(uint256(2900e18));
        bytes memory amount = abi.encodePacked(uint256(1e18));
        bytes memory isBuyOrder = abi.encodePacked(true);
        
        uint256 fee = 0.0003 ether;
        
        console.log("Fee required:", fee);
        console.log("Creating order with:");
        console.log("  Limit Price: $2900");
        console.log("  Amount: 1 ETH");
        console.log("  Type: BUY");
        
        uint256 orderId = hook.createOrder{value: fee}(
            poolKey,
            limitPrice,
            amount,
            isBuyOrder
        );
        
        console.log("\nOrder created! ID:", orderId);
        
        vm.stopBroadcast();
    }
}
