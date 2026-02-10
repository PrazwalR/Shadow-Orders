// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {IncoTest} from "@inco/lightning/src/test/IncoTest.sol";
import {GWEI} from "@inco/lightning/src/shared/TypeUtils.sol";
import {euint256, ebool, e, inco} from "@inco/lightning/src/Lib.sol";

import {ShadowOrdersHook} from "../ShadowOrdersHook.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";

// Wrapper to disable hook address validation during testing
contract ShadowOrdersHookTestable is ShadowOrdersHook {
    constructor(IPoolManager _poolManager, address _keeper) ShadowOrdersHook(_poolManager, _keeper) {}
    
    function validateHookAddress(BaseHook) internal pure override {}
}

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

contract ShadowOrdersHookTest is IncoTest {
    using e for *;
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    ShadowOrdersHook public hook;
    PoolManager public poolManager;
    
    address public keeper = address(0xBEEF);
    
    Currency public currency0;
    Currency public currency1;
    PoolKey public poolKey;
    
    uint256 public constant INITIAL_BALANCE = 100 ether;
    uint256 public constant TEE_FEE = 0.0001 ether;
    
    function setUp() public override {
        super.setUp();
        
        vm.deal(keeper, INITIAL_BALANCE);
        vm.deal(alice, INITIAL_BALANCE);
        vm.deal(bob, INITIAL_BALANCE);
        
        poolManager = new PoolManager(address(this));
        
        uint160 permissions = uint160(
            Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG
        );
        
        address hookAddress = address(uint160(permissions) | uint160(0x8000000000000000000000000000000000000000));
        
        ShadowOrdersHookTestable impl = new ShadowOrdersHookTestable(
            IPoolManager(address(poolManager)),
            keeper
        );
        
        vm.etch(hookAddress, address(impl).code);
        
        vm.store(hookAddress, bytes32(uint256(1)), bytes32(uint256(0)));
        vm.store(hookAddress, bytes32(uint256(2)), bytes32(uint256(uint160(keeper))));
        hook = ShadowOrdersHook(payable(hookAddress));
        
        currency0 = Currency.wrap(address(0));
        currency1 = Currency.wrap(address(0x1));
        
        poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
        
        vm.deal(address(hook), 1 ether);
    }
    
    function test_CreateOrder_Success() public {
        console.log("Testing order creation...");
        
        uint256 limitPrice = 3000 * 1e18;
        uint256 amount = 1 ether;
        bool isBuyOrder = true;
        
        bytes memory limitPriceInput = fakePrepareEuint256Ciphertext(limitPrice, alice, address(hook));
        bytes memory amountInput = fakePrepareEuint256Ciphertext(amount, alice, address(hook));
        bytes memory isBuyOrderInput = fakePrepareEboolCiphertext(isBuyOrder, alice, address(hook));
        
        uint256 requiredFee = inco.getFee() * 3;
        
        vm.prank(alice);
        uint256 orderId = hook.createOrder{value: requiredFee}(
            poolKey,
            limitPriceInput,
            amountInput,
            isBuyOrderInput
        );
        
        processAllOperations();
        
        assertEq(orderId, 0, "First order ID should be 0");
        
        (address owner, bool isActive, PoolId poolId, uint256 createdAt) = hook.getOrderInfo(orderId);
        assertEq(owner, alice, "Order owner should be Alice");
        assertTrue(isActive, "Order should be active");
        assertEq(PoolId.unwrap(poolId), PoolId.unwrap(poolKey.toId()), "Pool ID should match");
        assertGt(createdAt, 0, "Created timestamp should be set");
        
        console.log("Order created successfully! ID:", orderId);
    }
    
    function test_CreateOrder_MultipleOrders() public {
        console.log("Testing multiple order creation...");
        
        uint256 requiredFee = inco.getFee() * 3;
        
        // Alice creates order 1
        vm.prank(alice);
        uint256 order1 = hook.createOrder{value: requiredFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(3000 * 1e18, alice, address(hook)),
            fakePrepareEuint256Ciphertext(1 ether, alice, address(hook)),
            fakePrepareEboolCiphertext(true, alice, address(hook))
        );
        
        // Bob creates order 2
        vm.prank(bob);
        uint256 order2 = hook.createOrder{value: requiredFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(2900 * 1e18, bob, address(hook)),
            fakePrepareEuint256Ciphertext(2 ether, bob, address(hook)),
            fakePrepareEboolCiphertext(true, bob, address(hook))
        );
        
        // Alice creates order 3
        vm.prank(alice);
        uint256 order3 = hook.createOrder{value: requiredFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(3100 * 1e18, alice, address(hook)),
            fakePrepareEuint256Ciphertext(0.5 ether, alice, address(hook)),
            fakePrepareEboolCiphertext(false, alice, address(hook)) // Sell order
        );
        
        processAllOperations();
        
        // Verify order IDs are sequential
        assertEq(order2, order1 + 1, "Order 2 should be order1 + 1");
        assertEq(order3, order2 + 1, "Order 3 should be order2 + 1");
        
        // Verify orders by owner
        uint256[] memory aliceOrders = hook.getOrdersByOwner(alice);
        assertEq(aliceOrders.length, 2, "Alice should have 2 orders");
        assertEq(aliceOrders[0], order1, "Alice's first order");
        assertEq(aliceOrders[1], order3, "Alice's second order");
        
        uint256[] memory bobOrders = hook.getOrdersByOwner(bob);
        assertEq(bobOrders.length, 1, "Bob should have 1 order");
        assertEq(bobOrders[0], order2, "Bob's order");
        
        console.log("Multiple orders created successfully!");
    }
    
    function test_CreateOrder_InsufficientFee() public {
        console.log("Testing insufficient fee rejection...");
        
        uint256 insufficientFee = inco.getFee() * 2; // Need 3, only providing 2
        
        vm.prank(alice);
        vm.expectRevert(ShadowOrdersHook.InsufficientFee.selector);
        hook.createOrder{value: insufficientFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(3000 * 1e18, alice, address(hook)),
            fakePrepareEuint256Ciphertext(1 ether, alice, address(hook)),
            fakePrepareEboolCiphertext(true, alice, address(hook))
        );
        
        console.log("Insufficient fee correctly rejected!");
    }
    
    function test_CancelOrder_Success() public {
        console.log("Testing order cancellation...");
        
        // Create order
        uint256 requiredFee = inco.getFee() * 3;
        vm.prank(alice);
        uint256 orderId = hook.createOrder{value: requiredFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(3000 * 1e18, alice, address(hook)),
            fakePrepareEuint256Ciphertext(1 ether, alice, address(hook)),
            fakePrepareEboolCiphertext(true, alice, address(hook))
        );
        processAllOperations();
        
        (, bool isActiveBefore,,) = hook.getOrderInfo(orderId);
        assertTrue(isActiveBefore, "Order should be active before cancellation");
        
        vm.prank(alice);
        hook.cancelOrder(orderId);
        
        (, bool isActiveAfter,,) = hook.getOrderInfo(orderId);
        assertFalse(isActiveAfter, "Order should be inactive after cancellation");
        
        console.log("Order cancelled successfully!");
    }
    
    function test_CancelOrder_NotOwner() public {
        console.log("Testing cancellation by non-owner...");
        
        uint256 requiredFee = inco.getFee() * 3;
        vm.prank(alice);
        uint256 orderId = hook.createOrder{value: requiredFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(3000 * 1e18, alice, address(hook)),
            fakePrepareEuint256Ciphertext(1 ether, alice, address(hook)),
            fakePrepareEboolCiphertext(true, alice, address(hook))
        );
        processAllOperations();
        
        vm.prank(bob);
        vm.expectRevert(ShadowOrdersHook.OnlyOrderOwner.selector);
        hook.cancelOrder(orderId);
        
        console.log("Non-owner cancellation correctly rejected!");
    }
    
    function test_CancelOrder_AlreadyCancelled() public {
        console.log("Testing double cancellation...");
        
        uint256 requiredFee = inco.getFee() * 3;
        vm.prank(alice);
        uint256 orderId = hook.createOrder{value: requiredFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(3000 * 1e18, alice, address(hook)),
            fakePrepareEuint256Ciphertext(1 ether, alice, address(hook)),
            fakePrepareEboolCiphertext(true, alice, address(hook))
        );
        processAllOperations();
        
        vm.prank(alice);
        hook.cancelOrder(orderId);
        
        vm.prank(alice);
        vm.expectRevert(ShadowOrdersHook.OrderNotActive.selector);
        hook.cancelOrder(orderId);
        
        console.log("Double cancellation correctly rejected!");
    }
    
    function test_SetKeeper_Success() public {
        console.log("Testing keeper update...");
        
        address newKeeper = address(0xDEAD);
        
        vm.prank(keeper);
        hook.setKeeper(newKeeper);
        
        assertEq(hook.keeper(), newKeeper, "Keeper should be updated");
        
        console.log("Keeper updated successfully!");
    }
    
    function test_SetKeeper_NotKeeper() public {
        console.log("Testing keeper update by non-keeper...");
        
        vm.prank(alice);
        vm.expectRevert(ShadowOrdersHook.OnlyKeeper.selector);
        hook.setKeeper(address(0xDEAD));
        
        console.log("Non-keeper update correctly rejected!");
    }
    
    function test_SetKeeper_ZeroAddress() public {
        console.log("Testing keeper update to zero address...");
        
        vm.prank(keeper);
        vm.expectRevert(ShadowOrdersHook.ZeroAddress.selector);
        hook.setKeeper(address(0));
        
        console.log("Zero address correctly rejected!");
    }
    
    function test_CheckOrderExecutable_BuyOrder() public {
        console.log("Testing buy order execution check...");
        
        uint256 requiredFee = inco.getFee() * 3;
        vm.prank(alice);
        uint256 orderId = hook.createOrder{value: requiredFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(3000 * 1e18, alice, address(hook)),
            fakePrepareEuint256Ciphertext(1 ether, alice, address(hook)),
            fakePrepareEboolCiphertext(true, alice, address(hook))
        );
        processAllOperations();
        
        vm.prank(keeper);
        bool canExecute3000 = hook.checkOrderExecutable(orderId, 3000 * 1e18);
        processAllOperations();
        
        vm.prank(keeper);
        bool canExecute2940 = hook.checkOrderExecutable(orderId, 2940 * 1e18);
        processAllOperations();
        
        vm.prank(keeper);
        bool canExecute2900 = hook.checkOrderExecutable(orderId, 2900 * 1e18);
        processAllOperations();
        
        console.log("Buy order execution checks completed!");
    }
    
    function test_CheckOrderExecutable_SellOrder() public {
        console.log("Testing sell order execution check...");
        
        uint256 requiredFee = inco.getFee() * 3;
        vm.prank(alice);
        uint256 orderId = hook.createOrder{value: requiredFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(3000 * 1e18, alice, address(hook)),
            fakePrepareEuint256Ciphertext(1 ether, alice, address(hook)),
            fakePrepareEboolCiphertext(false, alice, address(hook))
        );
        processAllOperations();
        
        vm.prank(keeper);
        bool canExecute3000 = hook.checkOrderExecutable(orderId, 3000 * 1e18);
        processAllOperations();
        
        vm.prank(keeper);
        bool canExecute3060 = hook.checkOrderExecutable(orderId, 3060 * 1e18);
        processAllOperations();
        
        vm.prank(keeper);
        bool canExecute3100 = hook.checkOrderExecutable(orderId, 3100 * 1e18);
        processAllOperations();
        
        console.log("Sell order execution checks completed!");
    }
    
    function test_FeeRefund() public {
        console.log("Testing excess fee refund...");
        
        uint256 requiredFee = inco.getFee() * 3;
        uint256 excessFee = requiredFee + 0.5 ether;
        uint256 aliceBalanceBefore = alice.balance;
        
        vm.prank(alice);
        hook.createOrder{value: excessFee}(
            poolKey,
            fakePrepareEuint256Ciphertext(3000 * 1e18, alice, address(hook)),
            fakePrepareEuint256Ciphertext(1 ether, alice, address(hook)),
            fakePrepareEboolCiphertext(true, alice, address(hook))
        );
        processAllOperations();
        
        uint256 aliceBalanceAfter = alice.balance;
        uint256 actualCost = aliceBalanceBefore - aliceBalanceAfter;
        
        assertEq(actualCost, requiredFee, "Should only pay required fee");
        
        console.log("Fee refund working correctly!");
    }
    
    function test_ReceiveETH() public {
        console.log("Testing ETH receive for contract-paid model...");
        
        uint256 hookBalanceBefore = address(hook).balance;
        
        (bool success,) = address(hook).call{value: 1 ether}("");
        assertTrue(success, "Should accept ETH");
        
        assertEq(address(hook).balance, hookBalanceBefore + 1 ether);
        
        console.log("ETH receive working correctly!");
    }
}
