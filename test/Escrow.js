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
    const approveNftTransaction = await realEstate
      .connect(seller)
      .approve(escrow.address, 1);
    await approveNftTransaction.wait();

    // List property
    const listPropertyTransaction = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(1));
    await listPropertyTransaction.wait();

    // Deposit earnest
    const depositEarnestTransaction = await escrow
      .connect(buyer)
      .depositEarnest(1, { value: tokens(5) });
    await depositEarnestTransaction.wait();

    // Passed inspection
    const passedInspectionTransaction = await escrow
      .connect(inspector)
      .updateInspectionStatus(1, true);
    await passedInspectionTransaction.wait();

    // Approved sale
    const approvedSaleTransactionBuyer = await escrow
      .connect(buyer)
      .approveSale(1);
    await approvedSaleTransactionBuyer.wait();
    const approvedSaleTransactionSeller = await escrow
      .connect(seller)
      .approveSale(1);
    await approvedSaleTransactionSeller.wait();
    const approvedSaleTransactionLender = await escrow
      .connect(lender)
      .approveSale(1);
    await approvedSaleTransactionLender.wait();
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
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });

    it("Updates isListed", async () => {
      expect(await escrow.isListed(1)).to.be.equal(true);
    });

    it("Returns buyer address", async () => {
      expect(await escrow.buyer(1)).to.be.equal(buyer.address);
    });
    it("Returns purchase price", async () => {
      expect(await escrow.purchasePrice(1)).to.be.equal(tokens(10));
    });
    it("Returns escrow amount", async () => {
      expect(await escrow.escrowAmount(1)).to.be.equal(tokens(1));
    });
  });

  describe("Deposits", () => {
    it("Deposit earnest", async () => {
      expect(await escrow.getBalance()).to.be.equal(tokens(5));
    });
  });

  describe("Inspections", () => {
    it("Passed inspection", async () => {
      expect(await escrow.inspectionPassed(1)).to.be.equal(true);
    });
    it("Not passed inspection", async () => {
      const passedInspectionTransaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, false);
      await passedInspectionTransaction.wait();
      expect(await escrow.inspectionPassed(1)).to.be.equal(false);
    });
  });

  describe("Approve sale", () => {
    it("Sale is approved by buyer", async () => {
      expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
    });
    it("Sale is approved by seller", async () => {
      expect(await escrow.approval(1, seller.address)).to.be.equal(true);
    });
    it("Sale is approved by lender", async () => {
      expect(await escrow.approval(1, lender.address)).to.be.equal(true);
    });
  });

  describe("Finalized sale", () => {
    it("Finalize sale works", async () => {
      // Lender send money
      await lender.sendTransaction({ to: escrow.address, value: tokens(5) });

      // finalized sale
      await escrow
        .connect(seller)
        .finalizeSale(1);
      // await finalSaleTransaction.wait();
    });

    it("Transfer money to the seller", async () => {
      // Lender send money
      await lender.sendTransaction({ to: escrow.address, value: tokens(5) });

      // finalized sale
      await escrow
        .connect(seller)
        .finalizeSale(1);
      // await finalSaleTransaction.wait();

      expect(await escrow.getBalance()).to.be.equal(0)
    });
    it("Transfer NFT to buyer", async () => {
      // Lender send money
      await lender.sendTransaction({ to: escrow.address, value: tokens(5) });

      // finalized sale
      await escrow
        .connect(seller)
        .finalizeSale(1);
      // await finalSaleTransaction.wait();

      expect(await escrow.getBalance()).to.be.equal(0)

      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
    });
  });
});
