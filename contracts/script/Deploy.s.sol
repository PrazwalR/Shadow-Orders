// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ShadowOrdersHook} from "../src/ShadowOrdersHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";

/// @title Deploy Shadow Orders Hook via Factory
contract HookFactory {
    function deploy(bytes32 salt, IPoolManager poolManager, address keeper) external returns (address) {
        return address(new ShadowOrdersHook{salt: salt}(poolManager, keeper));
    }
}

contract DeployShadowOrders is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address keeper = vm.envAddress("KEEPER_ADDRESS");
        address poolManager = vm.envAddress("POOL_MANAGER");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("Keeper:", keeper);
        console.log("PoolManager:", poolManager);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy factory first
        HookFactory factory = new HookFactory();
        console.log("Factory:", address(factory));
        
        // Hook flags must match getHookPermissions() EXACTLY:
        // beforeSwap: true, afterSwap: true, afterSwapReturnDelta: true
        // All other flags must be false
        uint160 requiredFlags = uint160(
            Hooks.BEFORE_SWAP_FLAG |           // 1 << 7 = 0x80
            Hooks.AFTER_SWAP_FLAG |            // 1 << 6 = 0x40  
            Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG // 1 << 2 = 0x04
        ); // = 0xC4
        
        // Mask for all hook flag bits (bits 0-13)
        uint160 allFlagsMask = (1 << 14) - 1; // = 0x3FFF
        
        console.log("Required flags:", requiredFlags);
        
        // Mine salt for valid hook address from factory
        bytes32 initCodeHash = keccak256(abi.encodePacked(
            type(ShadowOrdersHook).creationCode,
            abi.encode(IPoolManager(poolManager), keeper)
        ));
        
        bytes32 salt;
        address hookAddress;
        for (uint256 i = 0; i < 100000; i++) {
            salt = bytes32(i);
            hookAddress = vm.computeCreate2Address(salt, initCodeHash, address(factory));
            // Check that EXACTLY the required flags are set (no extra flags)
            if ((uint160(hookAddress) & allFlagsMask) == requiredFlags) {
                break;
            }
        }
        
        console.log("Mined address:", hookAddress);
        console.log("Salt:", vm.toString(salt));
        
        // Deploy via factory
        address deployed = factory.deploy(salt, IPoolManager(poolManager), keeper);
        
        require(deployed == hookAddress, "Address mismatch");
        console.log("Deployed to:", deployed);
        
        vm.stopBroadcast();
    }
}
