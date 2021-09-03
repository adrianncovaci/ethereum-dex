const Dex = artifacts.require("Dex");
const Adr = artifacts.require("Adr");
const truffleAssert = require("truffle-assertions");

contract.skip("Dex", accounts => {
    it("Should add a token only if called by the owner", async () => {
        let dex = await Dex.deployed();
        let adr = await Adr.deployed();

        await truffleAssert.passes(
            dex.addToken(web3.utils.fromUtf8("ADR"), adr.address, {from: accounts[0]})
        )

        await truffleAssert.reverts(
            dex.addToken(web3.utils.fromUtf8("ADR"), adr.address, {from: accounts[1]})
        )
    });

    it("Should handle deposits correctly", async () => {
        let dex = await Dex.deployed();
        let adr = await Adr.deployed();

        await adr.approve(dex.address, 10000);
        await dex.deposit(web3.utils.fromUtf8("ADR"), 100);

        let balance = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"));
        assert.equal(balance.toNumber(), 100);
    });

    it("Should handle withdrawals correctly", async () => {
        let dex = await Dex.deployed();
        let adr = await Adr.deployed();

        await truffleAssert.passes(
            dex.withdraw(web3.utils.fromUtf8("ADR"), 20)
        );
    })

    it("Should handle faulty withdrawals correctly", async () => {
        let dex = await Dex.deployed();
        let adr = await Adr.deployed();

        await truffleAssert.reverts(
            dex.withdraw(web3.utils.fromUtf8("ADR"), 90)
        );
    });
    
    it("Should create buy order book if account has enough ethereum", async () => {
        let dex = await Dex.deployed();  
        let adr = await Adr.deployed();  

        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("ADR"), 3, 10)
        )

        dex.depositEth({value: 30});

        await truffleAssert.passes(
            dex.createLimitOrder(0, web3.utils.fromUtf8("ADR"), 3, 10)
        )
    });

    it("Should sell token if account has token available", async() => {
        let dex = await Dex.deployed();  
        let adr = await Adr.deployed();  

        await truffleAssert.reverts(
            dex.createLimitOrder(0, web3.utils.fromUtf8("ADR"), 1000, 10)
        )

        await truffleAssert.passes(
            dex.createLimitOrder(0, web3.utils.fromUtf8("ADR"), 3, 10)
        )
        
    });

    it("Should contain descendingly sort buy orders", async () => {
        let dex = await Dex.deployed();
        let adr = await Adr.deployed();

        dex.depositEth({value: 100000});
        await dex.createLimitOrder(0, web3.utils.fromUtf8("ADR"), 4, 84);

        const buyOrders = dex.getOrder(web3.utils.fromUtf8("ADR"), 0);

        for(let i = buyOrders.length - 1; i > 0; i++) {
            assert.equal(buyOrders[i].price >= buyOrders[i-1]);
        }
    });

    it("Should contain ascendingly sort sell orders", async () => {
        let dex = await Dex.deployed();
        let adr = await Adr.deployed();

        await adr.mintToOwner(1000);
        await dex.deposit(web3.utils.fromUtf8("ADR"), 1000);
        await dex.createLimitOrder(1, web3.utils.fromUtf8("ADR"), 3, 12);

        const sellOrders = dex.getOrder(web3.utils.fromUtf8("ADR"), 1);

        for(let i = sellOrders.length - 1; i > 0; i++) {
            assert.equal(sellOrders[i].price <= sellOrders[i-1]);
        }
    });

    // it("Should buy token and consume orders", async () => {
    //     let dex = await Dex.deployed();
    //     let adr = await Adr.deployed();
 
    //     const _buyOrders = await dex.getOrder(web3.utils.fromUtf8("ADR"), 0);
    //     assert.equal(_buyOrders[_buyOrders.length - 1].price, 84);
    //     assert.equal(_buyOrders[_buyOrders.length - 1].amount, 4);

    //     let initialAdrBalance = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"));
    //     let initialEth = await web3.eth.getBalance(accounts[0]);
    //     await dex.createMarketOrder(1, web3.utils.fromUtf8("ADR"), 3);
    //     let adrBalance = await dex.getBalanceOf(web3.utils.fromUtf8("ADR"));
    //     let ethBalance = await web3.eth.getBalance(accounts[0]);
    //     assert.equal(adrBalance.toNumber(), initialAdrBalance.toNumber() - 3);
    //     assert.equal(ethBalance, initialEth);
    //     const buyOrders = dex.getOrder(web3.utils.fromUtf8("ADR"), 1);
    //     assert.equal(buyOrders[buyOrders.length-1].price != 84);

    // });

});
