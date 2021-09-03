const Adr = artifacts.require("Adr");
const Wallet = artifacts.require("Wallet");

module.exports = async function (deployer, network, accounts) {
    deployer.deploy(Adr);
};
