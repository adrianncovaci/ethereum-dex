pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Wallet is Ownable {
    using SafeMath for uint256;
    struct Token {
        bytes32 sign;
        address _address;
    }

    bytes32[] tokenList;
    mapping(bytes32 => Token) tokenMapping;

    mapping(address => mapping(bytes32 => uint)) public balances;

    function addToken(bytes32 sign, address _addr) tokenDoesNotExist(sign) onlyOwner external {
        tokenMapping[sign] = Token(sign, _addr);
        tokenList.push(sign);
    }

    function withdraw(bytes32 sign, uint amount) tokenExists(sign) external {
        require(balances[msg.sender][sign] >= amount, "INSUFICIENT FUNDS");
        require(amount > 0, "CAN'T WITHDRAW 0 AMOUNT");

        uint initialValue = balances[msg.sender][sign];
        balances[msg.sender][sign] = balances[msg.sender][sign].sub(amount);
        IERC20(tokenMapping[sign]._address).transfer(msg.sender, amount);
        assert(balances[msg.sender][sign].add(amount) == initialValue);
    }

    function deposit(bytes32 sign, uint amount) tokenExists(sign) external {
        IERC20(tokenMapping[sign]._address).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender][sign] = balances[msg.sender][sign].add(amount);
    }

    function getBalanceOf(bytes32 sign) view external returns(uint) {
        return balances[msg.sender][sign];
    }

    modifier tokenDoesNotExist(bytes32 sign) {
        require(tokenMapping[sign]._address == address(0));
        _;
    }
 
    modifier tokenExists(bytes32 sign) {
        require(tokenMapping[sign]._address != address(0));
        _;
    }


}
