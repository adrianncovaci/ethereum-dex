pragma solidity ^0.8.0;

import "./Wallet.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Dex is Wallet {
    using SafeMath for uint256;
    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint id;
        address _address;
        Side side;
        uint amount;
        bytes32 sign;
        uint price;
        uint completed;
    }

    mapping(bytes32 => mapping(uint8 => Order[])) orderBook;
    Order[] orders;

    function getOrder(bytes32 sign, Side side) public view returns(Order[] memory) {
        return orderBook[sign][uint8(side)];
    }

    function depositEth() public payable returns(bool) {
        balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(msg.value);
        return true;
    }

    function buyOrder(bytes32 sign, uint amount, uint price) affordsIt(amount.mul(price)) private returns(bool) {
        Order memory newOrder = Order(orders.length + 1, msg.sender, Side.BUY, amount, sign, price, 0);
        orders.push(newOrder);
        orderBook[sign][uint8(Side.BUY)].push(newOrder);
        uint length = orderBook[sign][uint8(Side.BUY)].length;
        for(uint i = 0; i < length - 1; i++)
            for(uint j = i + 1; j < length; j++) {
                if(orderBook[sign][uint8(Side.BUY)][i].price > orderBook[sign][uint8(Side.BUY)][j].price)  {
                    Order memory temp = orderBook[sign][uint8(Side.BUY)][j];
                    orderBook[sign][uint8(Side.BUY)][j] = orderBook[sign][uint8(Side.BUY)][i];
                    orderBook[sign][uint8(Side.BUY)][i] = temp;
                }
            }
        return true;
    }

    function sellOrder(bytes32 sign, uint amount, uint price) canSell(sign, amount) private returns(bool) {
        Order memory newOrder = Order(orders.length + 1, msg.sender, Side.SELL, amount, sign, price, 0);
        orders.push(newOrder);
        orderBook[sign][uint8(Side.SELL)].push(newOrder);
        uint length = orderBook[sign][uint8(Side.SELL)].length;
        for(uint i = 0; i < length - 1; i++)
            for(uint j = i + 1; j < length; j++) {
                if(orderBook[sign][uint8(Side.SELL)][i].price < orderBook[sign][uint8(Side.SELL)][j].price)  {
                    Order memory temp = orderBook[sign][uint8(Side.SELL)][j];
                    orderBook[sign][uint8(Side.SELL)][j] = orderBook[sign][uint8(Side.SELL)][i];
                    orderBook[sign][uint8(Side.SELL)][i] = temp;
                }
            }
        return true;
    }

    function createLimitOrder(Side side, bytes32 sign, uint amount, uint price) public returns(bool) {
        if (uint8(side) == 0) {
            require(buyOrder(sign, amount, price), "FAILED TO CREATE BUY ORDER");
            return true;
        }
        require(sellOrder(sign, amount, price), "FAILED TO CREATE SELL ORDER");
        return true;
    }

    function createMarketOrder(Side side, bytes32 sign, uint amount) public returns(bool) {
        require(amount > 0, "CANT CREATE MARKET ORDER WITH 0 AMOUNT");
        if (side == Side.SELL) {
            require(balances[msg.sender][sign] >= amount, "NOT ENOUGH FUNDS TO SELL");
        }
        uint8 orderBookSide = side == Side.BUY ? 1 : 0;
        uint completed = 0;
        Order[] storage orders = orderBook[sign][orderBookSide];

        if (orders.length == 0) {
            return true;
        }
        
        for(uint i = 0; i < orders.length && completed < amount; i++) {
            uint prevCompleted = completed;
            completed = completed.add(orders[i].amount);
            orders[i].completed = completed <= amount ? orders[i].amount : amount - prevCompleted;
            if (side == Side.BUY) {
                require(
                    balances[msg.sender][bytes32("ETH")] >= orders[i].completed.mul(orders[i].price),
                    "YOU DONT HAVE ENOUGH FUNDS"
                );
                balances[orders[i]._address][sign] = balances[orders[i]._address][sign].sub(orders[i].completed);
                balances[orders[i]._address][bytes32("ETH")] = balances[orders[i]._address][bytes32("ETH")].add(orders[i].completed.mul(orders[i].price));
                balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].sub(orders[i].completed.mul(orders[i].price));
                balances[msg.sender][sign] = balances[msg.sender][sign].add(orders[i].completed);
            } else {
                balances[orders[i]._address][sign] = balances[orders[i]._address][sign].add(orders[i].completed);
                balances[orders[i]._address][bytes32("ETH")] = balances[orders[i]._address][bytes32("ETH")].sub(orders[i].completed.mul(orders[i].price));
                balances[msg.sender][bytes32("ETH")] = balances[msg.sender][bytes32("ETH")].add(orders[i].completed.mul(orders[i].price));
                balances[msg.sender][sign] = balances[msg.sender][sign].sub(orders[i].completed);
            }
        }


        while (orders.length > 0) {
            if(orders[0].completed == orders[0].amount) {
                for(uint i = 0; i < orders.length - 1; i++) {
                    orders[i] = orders[i + 1];
                }
                orders.pop();
            }
        }
        return true;
    }

    modifier affordsIt(uint value) {
        require(balances[msg.sender]["ETH"] >= value, "NOT ENOUGH FUNDS TO BUY");
        _;
    }

    modifier canSell(bytes32 sign, uint value) {
        require(balances[msg.sender][sign] >= value, "NOT ENOUGH FUNDS TO SELL");
        _;
    }
}
