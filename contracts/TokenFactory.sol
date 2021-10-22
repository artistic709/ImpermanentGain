pragma solidity 0.8.7;

// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ERC20.sol";

contract TokenFactory {
    address immutable template;

    event NewTokenCreated(address owner, address token);

    function newToken(address _owner, string calldata _name, string calldata _symbol, uint8 _decimals) external returns (address token) {
        token = createClone(template);
        ERC20Mintable(token).init(_owner, _name, _symbol, _decimals);
        emit NewTokenCreated(_owner, token);
    }

    function createClone(address target) internal returns (address result) {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let clone := mload(0x40)
            mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(clone, 0x14), targetBytes)
            mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            result := create(0, clone, 0x37)
        }
    }

    constructor() {
        ERC20Mintable instance = new ERC20Mintable();
        template = address(instance);
    }
}
