pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Adr is ERC20 {
    address owner;
    constructor() ERC20("ADRIAN", "ADR") {
        _mint(msg.sender, 100000);  
        owner = msg.sender;
    }


    function mintToOwner(uint amount) onlyOwner public returns(bool) {
        _mint(msg.sender, 1000);  
        return true;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "YOU ARE NOT THE OWNER");
        _;
    }
}
