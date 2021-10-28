import { assert, expect, use } from "chai";
import { ethers } from "hardhat";
import { utils } from "ethers";
import chaiAsPromised from "chai-as-promised";
import { ERC20Mintable__factory, TokenFactory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

use(chaiAsPromised);

describe("TokenFactory", function () {
  let ERC20MintableDeployer: ERC20Mintable__factory;
  let tokenFactory: TokenFactory;
  let user: SignerWithAddress;

  const tokenName = "Test Token";
  const tokenSymbol = "TST";
  const decimal = 18;

  before(async function () {
    ERC20MintableDeployer = await ethers.getContractFactory("ERC20Mintable");
    user = (await ethers.getSigners())[0];

    const TokenFactoryDeployer = await ethers.getContractFactory(
      "TokenFactory"
    );
    tokenFactory = await TokenFactoryDeployer.deploy();
    await tokenFactory.deployed();
  });

  describe("Functionality", async function () {
    it("Should create a new token", async function () {
      const createTx = await tokenFactory.newToken(
        user.address,
        tokenName,
        tokenSymbol,
        decimal
      );

      const createReciept = await createTx.wait();

      expect(createReciept.events).to.have.lengthOf(1);
      expect(
        createReciept.events?.filter((e) => e.event === "NewTokenCreated")
      ).to.have.lengthOf(1);
      expect(createReciept.events?.[0].args?.owner).equal(user.address);
      assert(utils.isAddress(createReciept.events?.[0].args?.token));

      const tokenAddress = createReciept.events?.[0].args?.token;
      const token = ERC20MintableDeployer.attach(tokenAddress);

      expect(await token.name()).equal(tokenName);
      expect(await token.symbol()).equal(tokenSymbol);
      expect(await token.decimals()).equal(decimal);
    });

    it("Should return a address", async function () {
      const simulateAddress = await tokenFactory.callStatic.newToken(
        user.address,
        tokenName,
        tokenSymbol,
        decimal
      );

      assert(utils.isAddress(simulateAddress));
    });
  });
});
