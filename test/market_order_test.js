const Dex = artifacts.require("Dex");
const Adr = artifacts.require("Adr");
const truffleAssert = require("truffle-assertions");

contract("DexMarketOrder", accounts => {
    it("Should throw when trying to sell and not having enough token balance", async () => {
        let dex = await Dex.deployed();
        let balance = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"));

        assert.equal(balance.toNumber(), 0);

        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("ADR"), 1)
        );
    });

    it("Should throw when trying to buy and not having enough token balance", async () => {
        let dex = await Dex.deployed();
        let adr = await Adr.deployed();
        let balance = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"));
        let ethBalance = await dex.getBalanceOf(web3.utils.fromUtf8("ETH"));

        assert.equal(balance.toNumber(), 0);

        await adr.transfer(accounts[1], 1);
        await dex.addToken(web3.utils.fromUtf8("ADR"), adr.address);
        await adr.approve(dex.address, 1, {from: accounts[1]});
        await dex.deposit(web3.utils.fromUtf8("ADR"), 1, {from: accounts[1]});

        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 1, 100, {from: accounts[1]});
        assert.equal(ethBalance.toNumber(), 0);

        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("ADR"), 1)
        );

        await dex.depositEth({value: 100});

        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("ADR"), 1)
        );
        let orderbooks = await dex.getOrder(web3.utils.fromUtf8("ADR"), 1);

        let ethBalanceAfter = await dex.getBalanceOf(web3.utils.fromUtf8("ETH"));

        assert.equal(ethBalanceAfter.toNumber(), 0);

        assert.equal(orderbooks.length, 0);

    });

    it("Should pass when trying to buy/sell even if the order book is empty", async () => {
        let dex = await Dex.deployed();

        await dex.depositEth({value: 10000});

        let orderbooks = await dex.getOrder(web3.utils.fromUtf8("ADR"), 1);

        assert.equal(orderbooks.length, 0);

        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("ADR"), 1)
        );
    });

    it("Should consume only the market order amount if there is enough liquidity", async() => {
        let dex = await Dex.deployed();  
        let adr = await Adr.deployed();

        await adr.transfer(accounts[1], 500);
        await adr.transfer(accounts[2], 500);
        await adr.transfer(accounts[3], 500);

        await adr.approve(dex.address, 1000, {from: accounts[1]});
        await adr.approve(dex.address, 1000, {from: accounts[2]});
        await adr.approve(dex.address, 1000, {from: accounts[3]});

        await dex.deposit(web3.utils.fromUtf8("ADR"), 500, {from: accounts[1]});
        await dex.deposit(web3.utils.fromUtf8("ADR"), 500, {from: accounts[2]});
        await dex.deposit(web3.utils.fromUtf8("ADR"), 500, {from: accounts[3]});

        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 100, {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 150, {from: accounts[2]});

        let orderbooks = await dex.getOrder(web3.utils.fromUtf8("ADR"), 1);
        assert.equal(orderbooks.length, 2);

        await dex.createMarketOrder(0, web3.utils.fromUtf8("ADR"), 5);

        let orderbook = await dex.getOrder(web3.utils.fromUtf8("ADR"), 1);

        assert(orderbook.length == 1, "SELL ORDER SHOULD HAVE 1 ORDER");
        assert(orderbook.filled == 0, "SELL ORDER SHOULD HAVE NOTHING FILLED");
    });

    it("Should consume market order till the order book is empty (even if there are more tokens left to be consumed)", async() => {
        let dex = await Dex.deployed();  
        let adr = await Adr.deployed();
         
        let orderbook = await dex.getOrder(web3.utils.fromUtf8("ADR"), 1);

        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 100, {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 150, {from: accounts[2]});

        let initialBalance = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"));

        await dex.createMarketOrder(0, web3.utils.fromUtf8("ADR"), 1000);

        let balance = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"));

        assert.equal(initialBalance.toNumber() + 15, balance.toNumber());
    });

    it("Should consume eth balance of sender when issuing sell market order", async () => {
        let dex = await Dex.deployed();  
        let adr = await Adr.deployed();
         
        let orderbook = await dex.getOrder(web3.utils.fromUtf8("ADR"), 1);
        assert.equal(orderbook.length, 0);

        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 100, {from: accounts[1]});

        let initialBalance = await dex.getBalanceOf(web3.utils.fromUtf8("ETH"), {from: accounts[2]});

        await dex.createMarketOrder(0, web3.utils.fromUtf8("ADR"), 5, {from: accounts[2]});

        let balance = await dex.getBalanceOf(web3.utils.fromUtf8("ETH"), {from: accounts[2]});

        assert.equal(initialBalance.toNumber() + 100, balance.toNumber());
    });

    it("Should decrease token balance for filled amounts", async () => {
        let dex = await Dex.deployed();  
        let adr = await Adr.deployed();
         
        let orderbook = await dex.getOrder(web3.utils.fromUtf8("ADR"), 1);
        assert.equal(orderbook.length, 0);

        let initialBalance1 = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"), {from: accounts[1]});
        let initialBalance2 = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"), {from: accounts[2]});

        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 100, {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 100, {from: accounts[2]});

        await dex.createMarketOrder(0, web3.utils.fromUtf8("ADR"), 10);
        
        let balance1 = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"), {from: accounts[1]});
        let balance2 = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"), {from: accounts[2]});

        assert.equal(balance1.toNumber() + 1, initialBalance1.toNumber());
        assert.equal(balance2.toNumber() + 1, initialBalance2.toNumber());
    });

    it("Should eliminate order book if consumed", async () => {
        let dex = await Dex.deployed();  
        let adr = await Adr.deployed();
         
        let orderbook = await dex.getOrder(web3.utils.fromUtf8("ADR"), 1);
        assert.equal(orderbook.length, 0);

        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 100, {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 100, {from: accounts[2]});

        await dex.createMarketOrder(0, web3.utils.fromUtf8("ADR"), 10);
        assert.equal(orderbook.length, 0);
    });

    it("If order is filled partially, the data should be data accordingly", async () => {
        let dex = await Dex.deployed();  
        let adr = await Adr.deployed();
         
        let orderbook = await dex.getOrder(web3.utils.fromUtf8("ADR"), 1);
        assert.equal(orderbook.length, 0);

        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 100, {from: accounts[1]});
        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 5, 100, {from: accounts[2]});

        await dex.createMarketOrder(0, web3.utils.fromUtf8("ADR"), 7);

        assert.equal(orderbook.length, 1);
        assert.equal(orderbook[0].amount, 3);
    });

});
