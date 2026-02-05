Quickstart

Copy page

Get started with Inco Lightning in minutes

​
Prerequisites
Before you begin, make sure you have:
Bun installed (you can also chose to use node + npm or equivalent)
Docker installed
Foundry installed
Basic knowledge of Solidity and JavaScript/TypeScript
​
1-minute setup
We recommend getting started using our template.
Clone the repository:
git clone git@github.com:Inco-fhevm/lightning-rod.git
cd lightning-rod
Note that you can also clone the repository using HTTPS:
git clone https://github.com/Inco-fhevm/lightning-rod
cd lightning-rod
Install dependencies:
bun install
Compile contracts and test:
bun run test
Finally, stop the docker containers which were started for the test:
docker compose down
See README.md for other options on how to run the local development environment.
​
Next Steps
If you are using Inco for the first time we recommend following our guide of basics, or you can learn from example.
Concepts Guide
Learn the basics of Inco Lightning
Library Reference
Learn how to write confidential smart contracts

Library Reference

Copy page

All functions exposed by the Inco library

​
Installation

npm

yarn

bun
npm install @inco/lightning
​
Types
ebool: Encrypted bool
euint256: Encrypted uint256
eaddress: Encrypted address
​
Math operations
All arithmetic operations return an euint256. All binary operations may use either an euint256 or a regular uint256 as the first or second argument, or two euint256s.
Bitwise operations work on both euint256 and ebool types, and may use either encrypted or plain values as arguments.
Name	Function	Type	Returns
Addition	e.add	Binary	euint256
Subtraction	e.sub	Binary	euint256
Multiplication	e.mul	Binary	euint256
Division	e.div	Binary	euint256
Remainder	e.rem	Binary	euint256
BitAnd	e.and	Binary	euint256 or ebool
BitOr	e.or	Binary	euint256 or ebool
BitXor	e.xor	Binary	euint256 or ebool
Shift Right	e.shr	Binary	euint256
Shift Left	e.shl	Binary	euint256
Rotate Right	e.rotr	Binary	euint256
Rotate Left	e.rotl	Binary	euint256
​
Comparison operations
Name	Function	Type	Returns	Notes
Equal	e.eq	Binary	ebool	Works with euint256, eaddress, and combinations with plain types
Not equal	e.ne	Binary	ebool	Works with euint256, eaddress, and combinations with plain types
Greater than or equal	e.ge	Binary	ebool	euint256 only
Greater than	e.gt	Binary	ebool	euint256 only
Less than or equal	e.le	Binary	ebool	euint256 only
Less than	e.lt	Binary	ebool	euint256 only
Min	e.min	Binary	euint256	euint256 only
Max	e.max	Binary	euint256	euint256 only
Not	e.not	Unary	ebool	ebool only
​
Multiplexer
e.select(ebool, euint256, euint256) returns(euint256): Select between two euint256s based on an ebool condition
e.select(ebool, ebool, ebool) returns(ebool): Select between two ebools based on an ebool condition
e.select(ebool, eaddress, eaddress) returns(eaddress): Select between two eaddresses based on an ebool condition
​
Random Functions
All random functions require payment of the Inco fee.
e.rand() returns(euint256): Generate a random euint256 value
e.randBounded(uint256) returns(euint256): Generate a random euint256 value bounded by a uint256 upper limit
e.randBounded(euint256) returns(euint256): Generate a random euint256 value bounded by an euint256 upper limit
​
Inputs
e.asEuint256(uint256) returns(euint256): Convert a uint256 to an euint256 (trivial encrypt)
e.asEbool(bool) returns(ebool): Convert a bool to an ebool (trivial encrypt)
e.asEaddress(address) returns(eaddress): Convert an address to an eaddress (trivial encrypt)
e.newEuint256(bytes memory input) returns(euint256): Create a new euint256 from a ciphertext
e.newEbool(bytes memory input) returns(ebool): Create a new ebool from a ciphertext
e.newEaddress(bytes memory input) returns(eaddress): Create a new eaddress from a ciphertext
​
Type Casting
e.asEbool(euint256) returns(ebool): Cast an euint256 to an ebool
e.asEuint256(ebool) returns(euint256): Cast an ebool to an euint256
​
Access control
e.allow(euint256, address): Allow a user to access an euint256 value permanently
e.allow(ebool, address): Allow a user to access an ebool value permanently
e.allow(eaddress, address): Allow a user to access an eaddress value permanently
e.allowThis(euint256): Allow the current contract to access an euint256 value permanently
e.allowThis(ebool): Allow the current contract to access an ebool value permanently
e.allowThis(eaddress): Allow the current contract to access an eaddress value permanently
e.reveal(euint256): Make an euint256 value publicly accessible
e.reveal(ebool): Make an ebool value publicly accessible
e.reveal(eaddress): Make an eaddress value publicly accessible
e.isAllowed(address, euint256) returns(bool): Check if a user is allowed to access an euint256 value
Was this page helpful?


Yes

Fees

Copy page

Understanding Inco fees and which operations require them

Inco charges fees for certain operations to ensure the security and performance of the confidential computing infrastructure. This page explains how fees work and which operations require payment.
​
Fee Structure
Inco fees are paid in the native blockchain currency (ETH on Ethereum, etc.) and are required for operations that involve processing encrypted inputs from external sources.
​
Getting the Current Fee Amount
Use the inco.getFee() function to get the current fee amount:
uint256 fee = inco.getFee(); // 0.0001 ETH
​
Paying Fees
Fees can be paid in two ways: either by users including them in msg.value, or by having the contract pay from its own ETH balance.
​
Option 1: User Pays via msg.value
Fees must be paid via msg.value when calling functions that require them. The transaction will revert if insufficient fees are provided.
require(msg.value >= inco.getFee() * ciphertextCount, "Fee Not Paid");
​
Option 2: Contract Pays from Balance
Contracts can hold ETH in their balance to pay fees automatically, eliminating the need for users to include fees in msg.value.
contract MyContract {
    // Contract holds ETH to pay fees automatically

    function transfer(address to, bytes memory valueInput) external {
        // No payable modifier needed, no msg.value check required
        euint256 value = valueInput.newEuint256(msg.sender);
        // Contract's ETH balance is used to pay fees automatically
        // ... rest of function
    }

    // Function to top up contract's ETH balance
    function depositFees() external payable {
        // Allows anyone to add ETH to contract for fee payments
    }

    // Function to withdraw excess ETH
    function withdrawFees(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner()).transfer(amount);
    }
}
Benefits of contract-paid fees:
Better user experience - no need to calculate or send exact fees
Simpler function signatures - no payable modifier required
Automatic fee management by contract owner
Considerations:
Contract owner must ensure sufficient ETH balance
Monitor contract balance and top up as needed
Consider implementing balance thresholds and alerts
​
Operations That Require Fees
​
Encrypted Input Creation and Random Generation
The following operations create new encrypted handles from external ciphertexts or generate random values and require fees:
Operation	Fee Required	Description
e.newEuint256(bytes memory input)	1 fee per call	Create a new euint256 from an encrypted input
e.newEbool(bytes memory input)	1 fee per call	Create a new ebool from an encrypted input
e.newEaddress(bytes memory input)	1 fee per call	Create a new eaddress from an encrypted input
e.rand()	1 fee per call	Generate a random euint256 value
e.randBounded(uint256)	1 fee per call	Generate a bounded random euint256 value
e.randBounded(euint256)	1 fee per call	Generate a bounded random euint256 value
Example with user-paid fees:
function transfer(address to, bytes memory valueInput) external payable {
    // Each newEuint256 call requires 1 fee
    require(msg.value >= inco.getFee() * 1, "Fee Not Paid");
    euint256 value = valueInput.newEuint256(msg.sender);
    // ... rest of function
}
Example with contract-paid fees:
function transfer(address to, bytes memory valueInput) external {
    // No fee check needed - contract pays from its balance
    euint256 value = valueInput.newEuint256(msg.sender);
    // ... rest of function
}
Multiple encrypted inputs:
function multiInput(bytes memory input1, bytes memory input2) external payable {
    // Two newEuint256 calls require 2 fees (user pays)
    require(msg.value >= inco.getFee() * 2, "Fee Not Paid");
    euint256 value1 = input1.newEuint256(msg.sender);
    euint256 value2 = input2.newEuint256(msg.sender);
    // ... rest of function
}
Multiple encrypted inputs (contract pays):
function multiInput(bytes memory input1, bytes memory input2) external {
    // Contract automatically pays 2 fees from its balance
    euint256 value1 = input1.newEuint256(msg.sender);
    euint256 value2 = input2.newEuint256(msg.sender);
    // ... rest of function
}
​
Operations That Don’t Require Fees
All other Inco operations are free and don’t require any fee payment:
​
Math Operations
e.add, e.sub, e.mul, e.div, e.rem
e.and, e.or, e.xor, e.shr, e.shl, e.rotr, e.rotl
​
Comparison Operations
e.eq, e.ne, e.ge, e.gt, e.le, e.lt
e.min, e.max, e.not
​
Multiplexer Operations
e.select
​
Trivial Encryption (no external input)
e.asEuint256(uint256) - Convert known uint256 to euint256
e.asEbool(bool) - Convert known bool to ebool
​
Access Control
e.allow, e.allowThis, e.isAllowed
​
Fee Best Practices
​
For User-Paid Fees
​
Always Check Fees Before Operations
function _requireFee(uint256 ciphertextCount) internal view {
    require(msg.value >= inco.getFee() * ciphertextCount, "Insufficient fee");
}
​
Calculate Ciphertext Count Accurately
Count each newEuint256, newEbool or newEaddress call in your function to ensure you charge the correct total fee.
​
For Contract-Paid Fees
​
Monitor Contract Balance
function getContractFeeBalance() external view returns (uint256) {
    return address(this).balance;
}

function isBalanceSufficient(uint256 requiredFees) internal view returns (bool) {
    return address(this).balance >= requiredFees;
}
​
Implement Balance Management
function depositFees() external payable {
    // Allow topping up contract balance
}

function withdrawFees(uint256 amount) external onlyOwner {
    require(address(this).balance >= amount, "Insufficient balance");
    require(amount <= address(this).balance - minimumReserve, "Cannot withdraw below minimum reserve");
    payable(owner()).transfer(amount);
}
​
General Best Practices
​
Handle Fee Changes
Fees may change over time. Always use inco.getFee() rather than hardcoding fee amounts.
​
Test Fee Requirements
When testing contracts, ensure sufficient funds for both approaches:
// For user-paid fees in Foundry tests
vm.deal(user, inco.getFee() * 2); // User needs ETH for fees

// For contract-paid fees in Foundry tests
vm.deal(address(contract), inco.getFee() * 10); // Contract needs ETH balance
​
Common Fee-Related Errors
​
User-Paid Fee Errors
“Fee Not Paid”: Transaction reverted due to insufficient msg.value
Overpaying: While allowed, unnecessary ETH is consumed as gas
Fee changes: Contract fails if fees increase between deployment and usage
​
Contract-Paid Fee Errors
“Insufficient contract balance”: Contract doesn’t have enough ETH to pay fees
“Below minimum reserve”: Withdrawal attempts that would leave insufficient funds
“Contract balance depleted”: Functions fail when contract runs out of ETH during high usage

Cheatcodes reference

Copy page

Fully simulate the Inco environment all from solidity tests

​
Execute the operations
Inco’s infrastructure is monitoring the operations requested over encrypted variables by the smart contracts.
Inco executes them asynchronously after the blocks containing the ops are mined. Under the hood, the Inco singleton instance on each supported chain is emitting events to request the operations (that includes encrypts, trivial encrypts, all logical and mathematical operations, and decryption requests). The solidity-based mock is using Foundry’s vm.recordLogs() function to record the pending ops.
As the events recording are consumed whenever read, there would be conflicts if you try to use recordLogs in your tests.
To simulate Inco processing the operations, which assigns to its internal value store its encrypted value to each handle, use the following cheatcode:
processAllOperations();
This cheatcode must be called before reading the value of any encrypted variable, and performing assert statements. processAllOperations also executes any pending decryption callback.
​
Simulate Inputs
Encrypted inputs are normally generated using Inco’s JS SDK. Simulate them with the following cheatcodes:
​
For euint256
fakePrepareEuint256Ciphertext(uint256 value) returns (bytes memory ciphertext);

// example usage
token.transfer(bob, fakePrepareEuint256Ciphertext(1 ether));
​
For ebool
fakePrepareEboolCiphertext(bool value) returns (bytes memory ciphertext);

// example usage
someContract.setActive(fakePrepareEboolCiphertext(true));
​
For eaddress
fakePrepareEaddressCiphertext(address value) returns (bytes memory ciphertext);

// example usage
token.setOwner(fakePrepareEaddressCiphertext(alice));
​
Simulate decryption
Allowed accounts can request reading the values of e-variables using JS SDK. In the tests, you can read any value bypassing the access control checks.
​
For euint256
getUint256Value(euint256 input) (uint256);

// example usage
assertEq(getUint256Value(token.balanceOf(alice)), 9 * GWEI);
​
For ebool
getBoolValue(ebool input) (bool);

// example usage
assertEq(getBoolValue(someContract.isActive()), true);
​
For eaddress
getAddressValue(eaddress input) (address);

// example usage
assertEq(getAddressValue(token.owner()), alice);
To fully test how one of your user could see its encrypted data, we recommend combining an assertion over the decrypted value with an access control check.
// example, we check that alice can read her balance
assertTrue(token.balanceOf(alice).isAllowed(alice));

Setup

Copy page

Setup your repo

​
Using the lightning-rod template (recommended)
We recommend using our template which comes with foundry already setup.
git clone git@github.com:Inco-fhevm/lightning-rod.git
cd lightning-rod
bun install
Using the template, you may want to skip to the cheatcodes reference.
​
Or setup manually
You do not need to follow these steps if you are using the lightning-rod template.
Follow these steps to add inco to your existing project, or manually setup a new one.
​
Download the inco libraries
Inco uses npm packages to provide its solidity library.
bun add @inco/lightning
Alternatively, you can use npm/yarn/pnpm.
​
Setup remappings
Create a file remappings.txt at the root of your contracts directory.
touch remappings.txt
Edit your remappings paths according to your setup.
forge-std/=your/path/to/forge-std/src/
ds-test/=your/path/to/ds-test/src/
@inco/=path/to/your/node_modules/@inco/
@openzeppelin/=path/to/your/node_modules/@openzeppelin/
Due to how solidity imports and remappings work, your remappings have to follow the idiomatic form. Here are the requirements so your project compiles while using inco:
left to the = sign, have the following names
forge-std/
ds-test/
@inco/
@openzeppelin/
right to the = sign, have the path to the corresponding library
forge-std/ should point to the src/ directory of your local forge-std library
ds-test/ should point to the src/ directory of your local ds-test library
@inco/ should point to the @inco directory in your node_modules directory, and not to the @inco/lightning or @inco/shared directories
In the same way @openzeppelin/ should point to the @openzeppelin directory in your node_modules directory
To simplify this process, we recommend using bun/npm to import all the dependencies (including foundry-std and ds-test) like so:
bun add  @inco/lightning https://github.com/dapphub/ds-test https://github.com/foundry-rs/forge-std @openzeppelin/contracts
and using this remapping file (supposing that your node_modules sit one directory up from your contracts directory):
@openzeppelin/=../node_modules/@openzeppelin/
forge-std/=../node_modules/forge-std/src/
ds-test/=../node_modules/ds-test/src/
@inco/=../node_modules/@inco/

ntroduction

Copy page

Welcome to Inco!

Inco Lightning is currently available on Base Sepolia in beta testnet. We are actively working on making Inco Lightning available to other chains.
Inco (short for “incognito”) is the confidentiality layer for existing blockchains.
​
What is Inco Lightning?
Inco Lightning uses Trusted Execution Environments (TEEs) to deliver verifiable confidential compute at lightning-fast speeds. It introduces new private data types, operations, and access controls, enabling smart contracts to process sensitive data securely. No new chain, no new wallet. Just import our Solidity library and start building privacy-preserving dApps today.
Was this page helpful?


Yes

Concepts Guide Introduction

Copy page

Walkthrough all the concepts you need to know to get started with Inco

​
Welcome
This guide will get you up to speed on all the concepts you need to know to develop your first confidential dapp. Throughout this guide, we will be using several examples, the most common one being a confidential token. A confidential token behaves similarly to a regular ERC20 token, but the balances of the holders, and transfer amounts are hidden from the public.
Here is the full code of a simple confidential token contract:
// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import {euint256, ebool, e} from "@inco/lightning/Lib.sol";

contract SimpleConfidentialToken {
    using e for *;

    mapping(address => euint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = uint256(1000 * 1e9).asEuint256();
    }

    function transfer(
        address to,
        bytes memory valueInput
    ) external returns (ebool) {
        euint256 value = valueInput.newEuint256(msg.sender);
        return _transfer(to, value);
    }

    function transfer(
        address to,
        euint256 value
    ) public returns (ebool success) {
        require(
            msg.sender.isAllowed(value),
            "SimpleConfidentialToken: unauthorized value handle access"
        );

        return _transfer(to, value);
    }

    function _transfer(
        address to,
        euint256 value
    ) external returns (ebool success) {
        success = balanceOf[msg.sender].ge(value);
        euint256 transferredValue = success.select(
            value,
            uint256(0).asEuint256()
        );

        euint256 senderNewBalance = balanceOf[msg.sender].sub(transferredValue);
        euint256 receiverNewBalance = balanceOf[to].add(transferredValue);

        balanceOf[msg.sender] = senderNewBalance;
        balanceOf[to] = receiverNewBalance;

        senderNewBalance.allow(msg.sender);
        receiverNewBalance.allow(to);
        senderNewBalance.allowThis();
        receiverNewBalance.allowThis();
    }
}
Continue this guide to understand how this code works and its concepts.
Was this page helpful?


Yes

Handles

Copy page

Unique Identifier for an immutable piece of hidden data

​
E-Types
At the top of the confidential token implementation, we can see that we are importing new types of variables:
import {euint256, ebool, eaddress, e} from "@inco/lightning/Lib.sol";
euint256, ebool, and eaddress are the hidden counterparts of uint256, bool, and address, respectively. They are used to represent hidden values in the contract. The e- types are the hidden counterparts of the standard types in Solidity.
In our token example, the user balances are notably represented as euint256:
mapping(address => euint256) public balanceOf;
If we look into Inco’s library, we can see how euint256 and ebool are defined:
type euint256 is bytes32;
type ebool is bytes32;
type eaddress is bytes32;
If we try looking up on a block explorer the raw value returned by calling balanceOf, we will get something like:
0xa8d84064218bfc979af10dccc8153c9ab8a15068c3d64cb63927aca8ad1a3c9c
This gibberish value gives us no information about the actual balance of the user.
​
What is a Handle?
A handle is a unique identifier for an immutable piece of hidden data. In our token example, the balance of each user is represented as a handle, ebool success, euint256 value, etc. are also handles. The onchain smart contract is manipulating identifiers for a piece of hidden data (a balance, a boolean, etc.), and the actual data is safely stored offchain in an encrypted manner. Whenever an operation is performed over encrypted data types, the result is also a handle, like so:
euint256 senderNewBalance = balanceOf[msg.sender].sub(transferredValue);
A handle is immutable. If we were to reassigning a variable like so:
balanceOf[msg.sender] = balanceOf[msg.sender].sub(transferredValue);
balanceOf[msg.sender] would get assigned a new handle. It is important to keep in mind that the handle representing the old balance still exists, and still corresponds to the encrypted value of the old balance, even if the contract is not keeping track of it. We will see later in this guide that the value of handles are never lost and can still be accessed. From Inco’s standpoint, handles get created but never deleted.
Was this page helpful?


Yes

Inputs

Copy page

How to input external values and convert them to handles

import {euint256, ebool, eaddress, e} from "@inco/lightning/src/Lib.sol";
using e for *;
​
Case 1: the value comes from an offchain source
In the confidential transfer example, the first external method is meant to be called by an EOA / Smart account. It is using newEuint256 to convert the input value into a handle.
function transfer(
        address to,
        bytes memory valueInput
    ) external payable returns (ebool) {
        // Muliplied with one cause we consumed only one ciphertext i.e called `newEuint256` once
        require(msg.value >= inco.getFee() * 1, "Fee Not Paid");
        // This call needs the above fee otherwise it will fail
        euint256 value = valueInput.newEuint256(msg.sender);
        // stuff
    }
newEuint256 takes two arguments, the encrypted input value (in the form of bytes) and the address of the account doing the input (here msg.sender). This account should always be the one that created the input, it will be given decryption right over the handle. Passing another address than the user doing the input would be a malicious implementation.
Similarly, newEaddress can be used to convert encrypted address inputs into handles:
function setAuthorizedAddress(
    bytes memory addressInput
) external payable {
    require(msg.value >= inco.getFee() * 1, "Fee Not Paid");
    eaddress authorizedAddr = addressInput.newEaddress(msg.sender);
    // stuff
}
newEaddress works identically to newEuint256 but creates an eaddress handle instead of an euint256 handle. It requires the same fee payment and follows the same security principles regarding the originating account.
For boolean inputs, newEbool can be used to convert encrypted boolean inputs into handles:
function setFlag(
    bytes memory flagInput
) external payable {
    require(msg.value >= inco.getFee() * 1, "Fee Not Paid");
    ebool flag = flagInput.newEbool(msg.sender);
    // stuff
}
newEbool works identically to newEuint256 but creates an ebool handle instead of an euint256 handle. It requires the same fee payment and follows the same security principles regarding the originating account.
valueInput has to be a ciphertext, meaning it has to be the value intended to be transferred, encrypted in a way that Inco can understand. To do this, you can use the encrypt method from the JavaScript SDK.
If the bytes memory valueInput is malformed, Inco will fallback to the handle default value. The default value of euint256 is 0, and the default value of ebool is false.
Note: Consuming encrypted inputs on-chain requires paying an encryption fee per ciphertext (newEuint256). Ensure msg.value >= inco.getFee() × ciphertextCount, otherwise the call will revert.
After newEuint256 has been used, the resulting handle can be used immediately, there is no need for Inco to issue a confirmation to start using it in the contract logic. Inco will decrypt the corresponding ciphertext safely inside its TEE after the transaction has been included onchain. All operations onchain are performed virtually over identifiers, and reproduced over the actual values by Inco asynchronously. We call this model “symbolic execution”.
One could try to reuse the same ciphertext as another user to gain decryption access over it. Our JS SDK embeds context information in the ciphertext (originating account, chain, contract), and the value of the created handle will fallback to the default if it is used in another context.
​
Case 2 : the value comes from a variable
A known value can be turned into a handle using the asEuint256 method. This is sometimes called performing a “trivial encrypt” because the resulting handle will be of a known value. We can see it in the constructor of the token example:
constructor() {
    balanceOf[msg.sender] = uint256(1000 * 1e9).asEuint256();
}
Anyone can see that the initial value of balanceOf[msg.sender] is 1000 * 1e9, but after the deployer sends a few transfers, its balance will be unknown to the public.
Similarly, known boolean values can be converted using asEbool:
constructor() {
    isActive = true.asEbool();
}

Operations

Copy page

Compute over private state

Inco exposes mathematical and logical operations over encrypted data. Note that for each operation that takes 2 arguments (i.e binary types below), you can use either an e-type or a regular variable as the first or second argument. Each operation returns a single e-type as result.
Under the hood, all operations are performing a call to the Inco contract singleton. The Inco contract checks access control rules and emits an event for each operation
​
Example usage
euint256 a = e.asEuint256(2);
euint256 b = e.asEuint256(3);
euint256 c = a.add(b); // c = 5 (encrypted)
​
Supported math operations
All these operations return an euint256.
Name	Function	Type
Addition	e.add	Binary
Subtraction	e.sub	Binary
Multiplication	e.mul	Binary
Division	e.div	Binary
Remainder	e.rem	Binary
BitAnd	e.and	Binary
BitOr	e.or	Binary
BitXor	e.xor	Binary
Shift Right	e.shr	Binary
Shift Left	e.shl	Binary
Rotate Right	e.rotr	Binary
Rotate Left	e.rotl	Binary
​
Supported comparison operations
Name	Function	Type	Returns
Equal	e.eq	Binary	ebool
Not equal	e.ne	Binary	ebool
Greater than or equal	e.ge	Binary	ebool
Greater than	e.gt	Binary	ebool
Less than or equal	e.le	Binary	ebool
Less than	e.lt	Binary	ebool
Min	e.min	Binary	euint256
Max	e.max	Binary	euint256
Not	e.not	Unary	ebool
​
Random number generation
euint256 randomNumber = e.rand();
euint256 boundedRandom = e.randBounded(100); // Random number in [0, 100)
euint256 boundedRandomEncrypted = e.randBounded(encryptedUpperBound); // With encrypted upper bound
Name	Function	Type	Returns
Random	e.rand()	Unary	euint256
Random Bounded	e.randBounded(uint256 upperBound)	Unary	euint256
Random Bounded	e.randBounded(euint256 upperBound)	Unary	euint256
​
Type conversion functions
Convert between regular types and encrypted types, or between different encrypted types.
euint256 a = e.asEuint256(42);
ebool b = e.asEbool(true);
eaddress c = e.asEaddress(0x123...);
ebool d = e.asEbool(encryptedUint); // Cast from euint256
euint256 e = e.asEuint256(encryptedBool); // Cast from ebool
Name	Function	Type	Returns
Convert to euint256	e.asEuint256(uint256 a)	Unary	euint256
Convert to ebool	e.asEbool(bool a)	Unary	ebool
Convert to eaddress	e.asEaddress(address a)	Unary	eaddress
Cast euint256 to ebool	e.asEbool(euint256 a)	Unary	ebool
Cast ebool to euint256	e.asEuint256(ebool a)	Unary	euint256
​
Reveal functions
Reveal encrypted values (decrypt and make public).
e.reveal(encryptedUint);
e.reveal(encryptedBool);
e.reveal(encryptedAddress);
Name	Function	Type	Returns
Reveal	e.reveal(euint256 a)	Unary	void
Reveal	e.reveal(ebool a)	Unary	void
Reveal	e.reveal(eaddress a)	Unary	void
​
Additional type support
Comparison operations (e.eq and e.ne) also support eaddress comparisons in addition to euint256.
Bitwise operations (e.and, e.or, e.xor) also support ebool operations in addition to euint256.

Control Flow

Copy page

Using select and the multiplexer design pattern

Since Inco enables smart contracts to compute over private data without leaking any information, two common programming usages can’t be used.
You can’t use an if/else statement with a condition depending on a private value. The flow that the program would take would leak information about the private value.
For the same reason you can’t revert a transaction based on a condition depending on a private value.
To go around this, we use a pattern called the multiplexer design pattern.
​
Multiplexer Design Pattern
The inco equivalent of an if/else statement is the select statement. The select statement takes an encrypted boolean as first argument and two encrypted values as second and third arguments. The result of the select statement is the second argument if the first argument is true and the third argument otherwise.
Example usage from the confidential token contract:
function _transfer(address to, euint256 value) internal returns (ebool success) {
    // we check that the user has enough balance, and assign the result to the ebool success
    success = balanceOf[msg.sender].ge(value);
    // we use the select statement to assign the value to be transferred
    // if the the user has enough balance, we transfer the value
    // otherwise we assign 0 to the transferred value
    euint256 transferredValue = success.select(value, uint256(0).asEuint256());
    // ... rest of the transfer logic
}
In the confidential token example, instead of reverting if the user has insufficient balance, we transfer an amount of 0, which is equivalent to doing nothing. Expect this kind of logic in most confidential apps.

Access Control

Copy page

Fully programmable access control over encrypted data

The access control logic is fully programmable and onchain. Who has the right to decrypt and see a give ciphertext is visible onchain.
To give access to an account (i.e an address) to a ciphertext, you can use the e.allow function. This will grant the address permanent access to seeing, publicly decrypting and computing over the ciphertext.
Since handles are immutable, sharing access to a variable to an account only grants access to the current value of the variable. Whenever the variable is updated, the handle changes and the access to the new handle must be granted again. For example, ou can share your current balance with an address, but if you update your balance, the address will not be able to see the new value.
Example usage from the confidential token contract:
function _transfer(address to, euint256 value) internal returns (ebool success) {
    // ... some previous logic
    // allow the sender to see its new balance
    senderNewBalance.allow(msg.sender);
    // allow the receiver to see its new balance
    receiverNewBalance.allow(to);
    // allow this contract to be able to compute over the new balances in future transfers
    senderNewBalance.allowThis();
    receiverNewBalance.allowThis();
    // let the caller know if the transfer was successful
    success.allow(msg.sender);
}
e.allowThis(value) is an alias for e.allow(value, address(this)).
A common mistake is to forget to call allowThis on a variable after updating it. This will result in the contract being unable to compute over the variable in future transactions.
Always call e.allowThis after updating a variable, if this variable will be used in your contract again.
​
Transient Allowance
e.transientAllow is not yet available in the SDK, but coming very soon.
A transient allowance is an allowance that is valid only for the current transaction. All results of operations such as e.add are transiently allowed to be decrypted by the contract who called the operation. That is why contracts can perform back to back operations using results of previous operations. But since this allowance is transient, calling e.allowThis is necessary to allow the contract to compute over the result in future transactions.
​
How to reason about access
The correct way to think of access control is to consider that each account (i.e any address of EOA/contract/smart wallet) that received access to a ciphertext at some point, either transiently or permanently, knows its value, has stored it, and may compute over it. Note that once the access over a ciphertext is shared, the receiving account may share it with any other account, or publicly decrypt it. Be very mindful of the access you grant over your ciphertexts in your apps, and don’t consider transient allowances to be “safer” in any way than permanent ones.

Decryption

Copy page

Overview of decryption flows and access control.

Inco supports multiple ways to turn encrypted handles into plaintext, depending on who should learn the data and where the result must be consumed. This page summarizes the main flows and highlights how access control and signatures keep the data safe.
​
Signatures and EIP-712
Attested flows (attestedDecrypt, attestedCompute) require the user to prove control over their address.
The JS SDK does this by asking the user to sign an EIP-712 message that binds:
the caller’s address,
the requested operation (decrypt, compute),
and the handles / parameters involved in the request.
This ensures that only the address that has on-chain access to a handle (via e.allow or e.reveal) can request an attestation for it, and prevents a malicious party from replaying or forging decryption/computation requests.
​
Attested Decrypt
Use an off-chain covalidator to decrypt a handle for an authorized user and receive a signed attestation of the plaintext. Refer to Attested Decrypt for full examples. High-level flow:
A contract exposes an encrypted handle (e.g. created with e.rand()), and grants access with e.allow.
The authorized user calls zap.attestedDecrypt(...) from the JS SDK, which talks to the covalidator.
The response contains the plaintext plus the covalidator signature, enabling the user to post the plaintext back on-chain if needed.
​
Attested Reveal
If the contract already called e.reveal(handle), anyone may request an attested decryption because the handle is considered public. See Attested Reveal. The SDK call zap.attestedReveal([...handles]) returns plaintexts plus signatures that can be re-submitted on-chain. Warning: once e.reveal runs, the ciphertext is public forever.
​
Attested Compute
Sometimes the goal is to evaluate a predicate (e.g. creditScore >= 700) instead of exposing the raw value. Attested Compute executes the computation off-chain, still requiring the handle to be shared via e.allow or e.reveal. The SDK call zap.attestedCompute(...) returns the result (such as an ebool) alongside a covalidator signature so the decision can be verified on-chain without re-running the computation.

Verifying Attestations

Copy page

Verify attested decrypt, reveal, and compute responses in Solidity.

Attested flows (attestedDecrypt, attestedCompute, attestedReveal) allow wallets to convert an encrypted handle into plaintext or a computed result. This page shows how to plug those responses into Solidity, verify the covalidator signatures, and bind attestations to the expected handles.
​
DecryptionAttestation Structure
struct DecryptionAttestation {
    bytes32 handle;
    bytes32 value;
}
​
Attested Decrypt
Off-chain (JS SDK):
example.ts
client.ts
abi.ts
import { getContract } from "viem";
import { gatedAccessAbi } from "./abi";
import { walletClient } from "./client";

// 1. Create contract instance
const contract = getContract({
  address: "0x...", // Replace with your deployed contract address
  abi: gatedAccessAbi,
  client: walletClient,
});

// 2. Use attested decrypt and call contract
const results = await zap.attestedDecrypt(walletClient, [handleHex]);
const { handle, plaintext, covalidatorSignatures } = results[0];
const { value } = plaintext;

await contract.write.gatedAction([
  {
    handle,
    value,
  },
  covalidatorSignatures,
]);
On-chain (Solidity):
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {inco, ebool} from "@inco/lightning/src/Lib.sol";
import {asBool} from "@inco/lightning/src/shared/TypeUtils.sol";

contract GatedAccess {
    mapping(address => ebool) internal userAllowed;

    function gatedAction(
        DecryptionAttestation memory decryption,
        bytes[] memory signatures
    ) external {
        require(
            inco.incoVerifier().isValidDecryptionAttestation(decryption, signatures),
            "Invalid signature"
        );
        require(ebool.unwrap(userAllowed[msg.sender]) == decryption.handle, "Handle mismatch");
        require(asBool(decryption.value) == true, "Not allowed");

        // proceed
    }
}
​
Attested Reveal
Off-chain (JS SDK):
example.ts
client.ts
abi.ts
import { getContract } from "viem";
import { revealAbi } from "./abi";
import { walletClient } from "./client";

// 1. Create contract instance
const contract = getContract({
  address: "0x...", // Replace with your deployed contract address
  abi: revealAbi,
  client: walletClient,
});

// 2. Use attested reveal and call contract
const results = await zap.attestedReveal([handleHex]);
const { handle, plaintext, covalidatorSignatures } = results[0];
const { value } = plaintext;

await contract.write.submitRevealedValue([
  {
    handle,
    value,
  },
  covalidatorSignatures,
]);
On-chain (Solidity):
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {inco, e, ebool, euint256} from "@inco/lightning/src/Lib.sol";
import {asBool} from "@inco/lightning/src/shared/TypeUtils.sol";

contract GatedAccess {
    using e for *;

    euint256 someHandle;
    function submitRevealedValue(
        DecryptionAttestation memory decryption,
        bytes[] memory signatures
    ) external {
        require(
            inco.incoVerifier().isValidDecryptionAttestation(
                decryption,
                signatures
            ),
            "Invalid signature"
        );
        require(
            euint256.unwrap(someHandle) == decryption.handle,
            "Handle mismatch"
        );

        uint256 revealedValue = uint256(decryption.value);
        // use revealedValue
    }
}
​
Attested Compute
Attested compute first produces a computed handle (for example handleB = handleA.ge(700)), and then returns a decryption attestation for that result handle. On-chain you verify that:
the attestation is valid,
the decryption.handle matches the expected computed handle (e.g. handleB),
and the decrypted value of handleB satisfies your predicate.
Off-chain (JS SDK):
example.ts
client.ts
abi.ts
import { getContract } from "viem";
import { creditCheckAbi } from "./abi";
import { walletClient } from "./client";

// 1. Create contract instance
const contract = getContract({
  address: "0x...", // Replace with your deployed contract address
  abi: creditCheckAbi,
  client: walletClient,
});

// 2. Read encrypted credit score handle
const creditScoreHandle = await contract.read.userCreditScore([
  walletClient.account.address,
]);

// 3. Off-chain check: is credit score >= 700?
const { handle, plaintext, covalidatorSignatures } = await zap.attestedCompute(
  walletClient,
  creditScoreHandle,
  AttestedComputeSupportedOps.Ge,
  700n
);

const { value } = plaintext; // always boolean
await contract.write.submitCreditCheck([
  {
    handle,
    value,
  },
  covalidatorSignatures,
]);
On-chain (Solidity):
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {inco, e, ebool, euint256} from "@inco/lightning/src/Lib.sol";
import {asBool} from "@inco/lightning/src/shared/TypeUtils.sol";

contract GatedAccess {
    using e for *;

    // Encrypted credit score handle stored on-chain for each user
    mapping(address => euint256) internal userCreditScore;

    function submitCreditCheck(
        DecryptionAttestation memory decryption,
        bytes[] memory signatures
    ) external {
        // 1. Verify covalidator signatures over the attested result
        require(
            inco.incoVerifier().isValidDecryptionAttestation(
                decryption,
                signatures
            ),
            "Invalid signature"
        );

        // 2. Recompute the expected "creditScore >= 700" handle on-chain
        euint256 creditScore = userCreditScore[msg.sender];
        require(
            ebool.unwrap(creditScore.ge(700)) == decryption.handle,
            "Computed handle mismatch"
        );

        // 3. Check that the decrypted boolean is true
        require(asBool(decryption.value) == true, "Credit check failed");

        // proceed with approval
    }
}

NextJS Starter

Copy page

Get started quickly with our NextJS template for building dApps with Inco

Note: currently, the NextJS template only works against Base Sepolia. An updated template will be published shortly with a working setup against a local node and local covalidator.
​
Overview
The Inco NextJS starter template provides a pre-configured environment for building decentralized applications with privacy features. It includes everything you need to start building confidential dApps with NextJS and Inco.
​
NextJs Starter
Here’s a simple NextJs starter kit with incoJs: GitHub Template
​
Getting Started
​
1. Clone the Template
We can start by cloning our template project. You can either:
Go to our repository and click the Use this template button at the top of the page to create a new repository
Or clone it directly:
git clone https://github.com/Inco-fhevm/nextjs-template.git
cd nextjs-template
​
2. Install and Run
Install the project dependencies and start the development server:
npm install 
npm run dev

Use IncoJS in Existing Project

Copy page

Integrate incoJS into your existing JavaScript/TypeScript project.

Currently only tested with Webpack and NextJS. If you are using Rollup or Vite please report any issues here
​
Install
Choose your favorite package manager:

npm

yarn

bun
npm install @inco/js
​
Usage
A typical usage of @inco/js includes 3 steps:
Encrypting a value.
Posting the ciphertext to the contract, which will perform confidential computes on it.
Requesting a decryption of the result of the computation.
Next, follow the Encryption guide for a full walkthrough of these steps.
Was this page helpful?

Encrypting Values

Copy page

How to encrypt supported types (euint256, ebool, eaddress) with incoJS.

The zap.encrypt helper lets you encrypt plaintext values before sending them on-chain. incoJS currently supports three encrypted handle types:
handleTypes.euint256 — 256-bit unsigned integers.
handleTypes.ebool — booleans.
handleTypes.euint160 — Ethereum addresses (use BigInt to encode the address, effectively an eaddress).
​
Common setup
import { handleTypes, getViemChain, supportedChains } from '@inco/js';
import { createWalletClient, type Address } from 'viem';
import { Lightning } from '@inco/js/lite'

// Do this once at initialization
const chainId = supportedChains.baseSepolia;
const zap = Lightning.latest('testnet', chainId);
const walletClient = createWalletClient({
  chain: getViemChain(chainId),
  account: /* Choose your account, e.g. from window.ethereum */,
  transport: /* Choose your transport, e.g. from Alchemy */,
});
const dappAddress = '0x00000000000000000000000000000000deadbeef'; // Your contract
​
Encrypt an euint256
const amount = 42n;

const ct = await zap.encrypt(amount, {
  accountAddress: walletClient.account.address,
  dappAddress,
  handleType: handleTypes.euint256,
});
​
Encrypt an ebool
const flag = true;

const ct = await zap.encrypt(flag, {
  accountAddress: walletClient.account.address,
  dappAddress,
  handleType: handleTypes.ebool,
});
​
Encrypt an eaddress (aka euint160)
Addresses must be converted to a BigInt before encryption.
const address: Address = walletClient.account.address;

const ct = await zap.encrypt(BigInt(address), {
  accountAddress: walletClient.account.address,
  dappAddress,
  handleType: handleTypes.euint160,
});
Each example returns a ciphertext HexString you can pass to your contract or store as a handle for later confidential computation.
👉 See also: How encrypted inputs are consumed on the contract side
Was this page helpful?


Attested Decrypt

Copy page

Attested decrypt allows authorized user to request a decryption attestation and submit plaintext back on chain. Only handles that are allowed with e.allow() or e.reveal() can be used in decryption.
​
Getting Started
Take this example contract:
import {euint256, e, inco} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

contract TestAttestedDecrypt {
    euint256 randomNumber;
    uint256 decryptedNumber;

    constructor(address owner) payable {
        require(msg.value == inco.getFee(), "Fee not paid");
        randomNumber = e.rand();
        e.allow(randomNumber, address(this));
        e.allow(randomNumber, owner);
    }

    function GetHandle() external returns (euint256) {
        return randomNumber;
    }

    function SubmitDecryption(
        DecryptionAttestation memory decryption,
        bytes[] memory signatures
    ) external {
        require(
            inco.incoVerifier().isValidDecryptionAttestation(decryption, signatures),
            "Invalid Signature"
        );
        require(euint256.unwrap(randomNumber) == decryption.handle, "Handle mismatch");

        decryptedNumber = uint256(decryption.value);
    }
}
This contract creates a random 256bit integer and grants owner the ownership of the handle, allowing the owner to perform computations on it as well as decrypt it.
In order to decrypt the random integer, the owner can now request a decryption with attestation from covalidator and that’s done completely offchain.
​
Basic Decryption
Here’s how to decrypt a handle using a wallet client:
import { getViemChain, supportedChains, type HexString } from '@inco/js';
import { Lightning } from '@inco/js/lite';
import { createWalletClient, custom } from 'viem'

// Connect to Metamask or other wallet provider
const walletClient = createWalletClient({
  chain: getViemChain(supportedChains.baseSepolia),
  transport: custom(window.ethereum!)
})

const zap = await Lightning.latest('testnet', supportedChains.baseSepolia);
const results = await zap.attestedDecrypt(
  walletClient,
  ["0x<your_handle>" as HexString]
);
const plaintext = results[0].plaintext.value;
It’s also possible to decrypt multiple handles in a single request by passing an array of handles:
const results = await zap.attestedDecrypt(
  walletClient,
  [
    "0x<your_handle_1>" as HexString,
    "0x<your_handle_2>" as HexString
  ]
);
const plaintext1 = results[0].plaintext.value;
const plaintext2 = results[1].plaintext.value;
​
Understanding Reencryption vs Decryption
When using attested decrypt, you have two main options:
Decryption: Returns the plaintext value directly (as shown in the Basic Decryption examples above)
Reencryption: Instead of returning plaintext, the decrypted value is re-encrypted with a different public key. This allows you to share decrypted data with third parties (delegates) without exposing the plaintext, or to decrypt it locally using your own keypair.
Reencryption provides an additional layer of security by ensuring that even if the attested decrypt response is intercepted, the actual plaintext value remains encrypted and can only be decrypted by the intended recipient.
​
Reencryption for Delegates
You can request that the decryption be reencrypted for a delegate using their public key. This returns an encrypted decryption attestation that only the delegate can decrypt:
import { generateSecp256k1Keypair } from '@inco/js/lite';

// Generate a keypair for the delegate
const delegateKeypair = generateSecp256k1Keypair();
const delegatePubKey = delegateKeypair.encodePublicKey();

// Request reencryption for the delegate
const encryptedResults = await zap.attestedDecrypt(
  walletClient,
  ["0x<your_handle>" as HexString],
  delegatePubKey
);

// The delegate can decrypt using their keypair
const encryptedAttestation = encryptedResults[0].encryptedPlaintext;
// The delegate would decrypt this using their private key
​
Reencrypt and Decrypt Locally
You can also request reencryption and decrypt it immediately using a keypair you control:
import { generateSecp256k1Keypair } from '@inco/js/lite';

// Generate your own keypair
const keypair = generateSecp256k1Keypair();
const pubKey = keypair.encodePublicKey();

// Request reencryption and decrypt locally
const results = await zap.attestedDecrypt(
  walletClient,
  ["0x<your_handle>" as HexString],
  pubKey,
  keypair
);

const plaintext = results[0].plaintext.value;
​
Session Key Decryption
For applications that need to perform decryption without requiring the user to sign each request, you can use session keys with allowance vouchers:
import { generateSecp256k1Keypair } from '@inco/js/lite';

// Generate an ephemeral keypair for the session
const ephemeralKeypair = generateSecp256k1Keypair();

const defaultSessionVerifier = '0xc34569efc25901bdd6b652164a2c8a7228b23005';

// Grant a session key allowance voucher (done once, typically by the user)
const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
const voucher = await zap.grantSessionKeyAllowanceVoucher(
  walletClient,
  ephemeralKeypair.encodePublicKey(), // grantee address derived from keypair
  expiresAt,
  defaultSessionVerifier // or a custom session verifier
);

// Now decrypt using the session key (no wallet signature needed)
const results = await zap.attestedDecryptWithVoucher(
  ephemeralKeypair,
  voucher,
  ["0x<your_handle>" as HexString]
);

const plaintext = results[0].plaintext.value;
Session key decryption also supports reencryption:
// Reencrypt for a delegate using session key
const delegateKeypair = generateSecp256k1Keypair();
const encryptedResults = await zap.attestedDecryptWithVoucher(
  ephemeralKeypair,
  voucher,
  ["0x<your_handle>" as HexString],
  delegateKeypair.encodePublicKey()
);

// Or reencrypt and decrypt locally
const results = await zap.attestedDecryptWithVoucher(
  ephemeralKeypair,
  voucher,
  ["0x<your_handle>" as HexString],
  keypair.encodePublicKey(),
  keypair
);
​
Retry Configuration
All decryption methods support optional retry configuration:
const backoffConfig = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 10000
};

const results = await zap.attestedDecrypt(
  walletClient,
  ["0x<your_handle>" as HexString],
  backoffConfig
);
If you wish to perform a computation on a handle before decrypting it in a single request, check out Attested Compute .
​
Attested decrypt with Allowance Voucher/Session Key
Attested decrypt can also be called with a session key instead of a wallet provider using Allowance Voucher, allowing someone else to request decryption on your behalf.

Attested Reveal

Copy page

Attested reveal is similar to Attested Decrypt. The major difference is that anyone can request a decryption with attestation after e.reveal() has been called on a handle, allowing anyone to submit the decryption result back on-chain.
Once revealed with e.reveal(), the ciphertext is considered public and can be accessed by anyone. This action can not be undone.
​
Getting Started
Let’s examine this example contract:
import {euint256, e, inco} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";

contract TestAttestedReveal {
    euint256 randomNumber;
    uint256 decryptedNumber;

    constructor(address owner) payable {
        require(msg.value == inco.getFee(), "Fee not paid");
        randomNumber = e.rand();
        e.reveal(randomNumber);
    }

    function GetHandle() external returns (euint256) {
        return randomNumber;
    }

    function SubmitDecryption(
        DecryptionAttestation memory decryption,
        bytes memory signature
    ) external {
        require(
            inco.incoVerifier().isValidDecryptionAttestation(decryption, signature),
            "Invalid Signature"
        );
        require(euint256.unwrap(randomNumber) == decryption.handle, "Handle mismatch");
        decryptedNumber = uint256(decryption.value);
    }
}
This contract creates a random 256bit integer and immediately calls e.reveal(), allowing anyone to decrypt, perform computation on it or request an attestation, even though we haven’t explicitly granted permission to any particular address.
import { getViemChain, supportedChains, type HexString, type SupportedChainId } from '@inco/js';
import { createWalletClient, custom } from 'viem';

 //Connect to Metamask or other wallet provider
const walletClient = createWalletClient({
  chain: getViemChain(supportedChains.baseSepolia),
  transport: custom(window.ethereum!)
})

const zap = Lightning.latest('testnet', supportedChains.baseSepolia);

const results = await zap.attestedReveal(
    ["0x<revealed_handle>" as HexString]
);

const plaintext = results[0].plaintext;
The result contains the plaintext with covalidator signature. It can be used to submit back the decryption on-chain by calling “SubmitDecryption” as an alternative to the old callbacks.

Attested Compute

Copy page

Attested compute allows to perform a computation on a handle completely off-chain and get the decryption attestation containing decryption result and attestation. Only handles that are allowed with e.allow() or e.reveal() can be used in computation. The attestation can then be verified on-chain to perform certain on-chain actions, avoiding unnecessary transaction.
​
Getting Started
Take this example contract that holds an encrypted credit score of a user, to determine whether they’re eligible for a loan:
import {euint256, e, ebool, inco} from "@inco/lightning/src/Lib.sol";
import {DecryptionAttestation} from "@inco/lightning/src/lightning-parts/DecryptionAttester.types.sol";
import {asBool} from "@inco/lightning/src/shared/TypeUtils.sol";

contract TestAttestedCompute {
    euint256 hiddenCreditScore;

    constructor(address owner) payable {
        require(msg.value == inco.getFee(), "Fee not paid");
        hiddenCreditScore = e.asEuint256(800);
        e.allow(hiddenCreditScore, address(this));
        e.allow(hiddenCreditScore, owner);
    }

    function GetHandle() external returns (euint256) {
        return hiddenCreditScore;
    }

    function SubmitCreditCheck(
        DecryptionAttestation memory decryption,
        bytes[] memory signatures
    ) external {
        // Verify covalidator signatures over the attested result
        require(
            inco.incoVerifier().isValidDecryptionAttestation(decryption, signatures),
            "Invalid signature"
        );

        // Recompute the expected "creditScore >= 700" handle on-chain
        require(
            ebool.unwrap(e.ge(hiddenCreditScore, 700)) == decryption.handle,
            "Computed handle mismatch"
        );

        // Check that the decrypted boolean is true
        require(asBool(decryption.value) == true, "Credit check failed");

        // Credit check passed - proceed with loan approval
    }
}
Presume we want to know whether the credit score is greater than or equal 700 without sending an additional transaction. We can do that by calling attestedCompute (similar to Attested Decrypt):
import { Lightning } from '@inco/js/lite';
import { getViemChain, supportedChains, type HexString } from '@inco/js';
import { AttestedComputeSupportedOps } from '@inco/js/lite';
import { createWalletClient, custom } from 'viem'

const zap = await Lightning.latest('testnet', supportedChains.baseSepolia);

//Connect to Metamask or other wallet provider
const walletClient = createWalletClient({
  chain: getViemChain(supportedChains.baseSepolia),
  transport: custom(window.ethereum!)
})

// Retrieve the hiddenCreditScore handle from the contract by calling GetHandle(), e.g. using viem
const hiddenCreditScore = '0x<handle>' as HexString;

// isGreaterOrEqual = hiddenCreditScore >= 700
const isGreaterOrEqual = await zap.attestedCompute(
  walletClient,
  hiddenCreditScore,
  AttestedComputeSupportedOps.Ge,
  700n,
);

const creditScoreSufficient = isGreaterOrEqual.plaintext.value; // always boolean
Which is equivalent to:
ebool creditScoreSufficient = e.ge(hiddenCreditScore, 700);
isGreaterOrEqual also contains a signature from covalidator attesting to the computation, which can be used to submit decryption back on-chain, even if the handle doesn’t exist on chain yet.
​
Supported operations
Name	Op	Type	Returns
Equal	AttestedComputeSupportedOps.Eq	Scalar Binary*	bool
Not equal	AttestedComputeSupportedOps.Ne	Scalar Binary*	bool
Greater than or equal	AttestedComputeSupportedOps.Ge	Scalar Binary*	bool
Greater than	AttestedComputeSupportedOps.Gt	Scalar Binary*	bool
Less than or equal	AttestedComputeSupportedOps.Le	Scalar Binary*	bool
Less than	AttestedComputeSupportedOps.Lt	Scalar Binary*	bool
Scalar binary operation - operation that takes in two operands, one of which is a handle and the second one is a number (aka scalar).
​
Compute with Allowance Voucher/Session Key
Compute on a handle can be performed with a session key instead of a wallet provider using sessionKeyAttestedCompute(), see Allowance Voucher.
