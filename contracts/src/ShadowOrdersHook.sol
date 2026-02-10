// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {euint256, ebool, e, inco} from "@inco/lightning/src/Lib.sol";
import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";

contract ShadowOrdersHook is BaseHook {
    using e for *;
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    struct Order {
        address owner;
        euint256 limitPrice;
        euint256 amount;
        ebool isBuyOrder;
        bool isActive;
        PoolId poolId;
        uint256 createdAt;
    }

    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId;
    address public keeper;
    uint256 public constant KEEPER_FEE_BPS = 10;
    uint256 public constant EXECUTION_BUFFER_BPS = 200;
    mapping(address => uint256[]) public ordersByOwner;
    mapping(PoolId => uint256) public activeOrdersPerPool;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed owner,
        PoolId indexed poolId,
        uint256 createdAt
    );
    
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed owner
    );
    
    event OrderExecuted(
        uint256 indexed orderId,
        address indexed owner,
        address indexed executor,
        uint256 executionPrice,
        uint256 keeperFee
    );
    
    event KeeperUpdated(address indexed oldKeeper, address indexed newKeeper);

    error OnlyKeeper();
    error OnlyOrderOwner();
    error OrderNotActive();
    error OrderNotExecutable();
    error InsufficientFee();
    error InvalidOrder();
    error ZeroAddress();

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert OnlyKeeper();
        _;
    }

    modifier onlyOrderOwner(uint256 orderId) {
        if (msg.sender != orders[orderId].owner) revert OnlyOrderOwner();
        _;
    }

    constructor(
        IPoolManager _poolManager,
        address _keeper
    ) BaseHook(_poolManager) {
        if (_keeper == address(0)) revert ZeroAddress();
        keeper = _keeper;
        emit KeeperUpdated(address(0), _keeper);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: true,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function createOrder(
        PoolKey calldata poolKey,
        bytes calldata limitPriceInput,
        bytes calldata amountInput,
        bytes calldata isBuyOrderInput
    ) external payable returns (uint256 orderId) {
        uint256 requiredFee = inco.getFee() * 3;
        if (msg.value < requiredFee) revert InsufficientFee();
        
        euint256 limitPrice = limitPriceInput.newEuint256(msg.sender);
        euint256 amount = amountInput.newEuint256(msg.sender);
        ebool isBuyOrder = isBuyOrderInput.newEbool(msg.sender);
        
        orderId = nextOrderId++;
        PoolId poolId = poolKey.toId();
        
        orders[orderId] = Order({
            owner: msg.sender,
            limitPrice: limitPrice,
            amount: amount,
            isBuyOrder: isBuyOrder,
            isActive: true,
            poolId: poolId,
            createdAt: block.timestamp
        });
        
        limitPrice.allow(msg.sender);
        amount.allow(msg.sender);
        isBuyOrder.allow(msg.sender);
        
        limitPrice.allowThis();
        amount.allowThis();
        isBuyOrder.allowThis();
        
        limitPrice.allow(keeper);
        amount.allow(keeper);
        isBuyOrder.allow(keeper);
        
        ordersByOwner[msg.sender].push(orderId);
        activeOrdersPerPool[poolId]++;
        
        if (msg.value > requiredFee) {
            payable(msg.sender).transfer(msg.value - requiredFee);
        }
        
        emit OrderCreated(orderId, msg.sender, poolId, block.timestamp);
    }

    function cancelOrder(uint256 orderId) external onlyOrderOwner(orderId) {
        Order storage order = orders[orderId];
        if (!order.isActive) revert OrderNotActive();
        
        order.isActive = false;
        activeOrdersPerPool[order.poolId]--;
        
        emit OrderCancelled(orderId, msg.sender);
    }

    function checkOrderExecutable(
        uint256 orderId,
        uint256 currentPrice
    ) external returns (bool canExecute) {
        Order storage order = orders[orderId];
        if (!order.isActive) return false;
        
        euint256 currentPriceEncrypted = currentPrice.asEuint256();
        ebool isBuy = order.isBuyOrder;
        euint256 limitPrice = order.limitPrice;
        
        euint256 bufferMultiplier = isBuy.select(
            uint256(10000 - EXECUTION_BUFFER_BPS).asEuint256(),
            uint256(10000 + EXECUTION_BUFFER_BPS).asEuint256()
        );
        
        euint256 bufferedLimit = limitPrice.mul(bufferMultiplier).div(uint256(10000).asEuint256());
        
        ebool priceConditionMet = isBuy.select(
            currentPriceEncrypted.le(bufferedLimit),
            currentPriceEncrypted.ge(bufferedLimit)
        );
        
        priceConditionMet.allow(keeper);
        canExecute = true;
    }

    function executeOrder(
        uint256 orderId,
        PoolKey calldata poolKey,
        uint256 currentPrice
    ) external onlyKeeper {
        Order storage order = orders[orderId];
        if (!order.isActive) revert OrderNotActive();
        if (PoolId.unwrap(order.poolId) != PoolId.unwrap(poolKey.toId())) revert InvalidOrder();
        
        order.isActive = false;
        activeOrdersPerPool[order.poolId]--;
        
        euint256 currentPriceEncrypted = currentPrice.asEuint256();
        ebool isBuy = order.isBuyOrder;
        
        euint256 bufferMultiplier = isBuy.select(
            uint256(10000 - EXECUTION_BUFFER_BPS).asEuint256(),
            uint256(10000 + EXECUTION_BUFFER_BPS).asEuint256()
        );
        euint256 bufferedLimit = order.limitPrice.mul(bufferMultiplier).div(uint256(10000).asEuint256());
        
        ebool canExecute = isBuy.select(
            currentPriceEncrypted.le(bufferedLimit),
            currentPriceEncrypted.ge(bufferedLimit)
        );
        
        e.reveal(canExecute);
        
        emit OrderExecuted(orderId, order.owner, msg.sender, currentPrice, KEEPER_FEE_BPS);
    }

    function _beforeSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        if (hookData.length > 0) {
            uint256 orderId = abi.decode(hookData, (uint256));
            Order storage order = orders[orderId];
            
            if (!order.isActive) revert OrderNotActive();
            if (PoolId.unwrap(order.poolId) != PoolId.unwrap(key.toId())) revert InvalidOrder();
        }
        
        return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function _afterSwap(
        address sender,
        PoolKey calldata,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        if (hookData.length > 0 && sender == keeper) {
            int128 outputAmount = params.zeroForOne ? delta.amount1() : delta.amount0();
            
            if (outputAmount > 0) {
                int128 keeperFee = outputAmount * int128(int256(KEEPER_FEE_BPS)) / 10000;
                return (this.afterSwap.selector, keeperFee);
            }
        }
        
        return (this.afterSwap.selector, 0);
    }

    function getOrdersByOwner(address owner) external view returns (uint256[] memory) {
        return ordersByOwner[owner];
    }

    function getOrderInfo(uint256 orderId) external view returns (
        address owner,
        bool isActive,
        PoolId poolId,
        uint256 createdAt
    ) {
        Order storage order = orders[orderId];
        return (order.owner, order.isActive, order.poolId, order.createdAt);
    }

    function getActiveOrderCount(PoolId poolId) external view returns (uint256) {
        return activeOrdersPerPool[poolId];
    }

    function getTotalOrderCount() external view returns (uint256) {
        return nextOrderId;
    }

    function setKeeper(address newKeeper) external {
        if (newKeeper == address(0)) revert ZeroAddress();
        if (msg.sender != keeper && keeper != address(0)) revert OnlyKeeper();
        
        address oldKeeper = keeper;
        keeper = newKeeper;
        emit KeeperUpdated(oldKeeper, newKeeper);
    }

    receive() external payable {}

    function withdrawFees(address to) external onlyKeeper {
        if (to == address(0)) revert ZeroAddress();
        payable(to).transfer(address(this).balance);
    }
}
