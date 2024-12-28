const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let buyer, seller, inspector, lender;
  let realEstate, escrow;

  beforeEach(async () => {
    [buyer, seller, inspector, lender] = await ethers.getSigners();

    // Deploy Real Estate
    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();

    // Mint
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      );

    await transaction.wait();

    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    );

    // Approve property
    const approveNftTransaction = await realEstate.connect(seller).approve(escrow.address,1) 
    await approveNftTransaction.wait()

    // List property
    const listPropertyTransaction = await escrow.connect(seller).list(1, buyer.address, tokens(10), tokens(1))
    await listPropertyTransaction.wait()
  });
  describe("Deployment", () => {

    it("Returns NFT address", async () => {
      const resultNft = await escrow.nftAddress();
      expect(resultNft).to.be.equal(realEstate.address);
    });
    it("Returns Seller address", async () => {
      const resultSeller = await escrow.seller();
      expect(resultSeller).to.be.equal(seller.address);
    });
    it("Returns Inspector address", async () => {
      const resultInspector = await escrow.inspector();
      expect(resultInspector).to.be.equal(inspector.address);
    });
    it("Returns Lender address", async () => {
      const resultLender = await escrow.lender();
      expect(resultLender).to.be.equal(lender.address);
    });
  });

  describe("Listing", () => {

    it("Updates ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address)
    });

    it("Updates isListed", async () => {
      expect(await escrow.isListed(1)).to.be.equal(true)
    });

    it("Returns buyer address", async () => {
      expect(await escrow.buyer(1)).to.be.equal(buyer.address)
    });
    it("Returns purchase price", async () => {
      expect(await escrow.purchasePrice(1)).to.be.equal(tokens(10))
    });
    it("Returns escrow amount", async () => {
      expect(await escrow.escrowAmount(1)).to.be.equal(tokens(1))
    });
  });
});
