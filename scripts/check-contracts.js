const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking contract addresses and status...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer address:", deployer.address);

  // Try to get addresses from environment variables
  const USER_MANAGEMENT_ADDRESS = process.env.USER_MANAGEMENT_ADDRESS;
  const ROLE_UPGRADE_ADDRESS = process.env.ROLE_UPGRADE_ADDRESS;

  console.log("\n📋 Environment Variables:");
  console.log("USER_MANAGEMENT_ADDRESS:", USER_MANAGEMENT_ADDRESS || "❌ Not set");
  console.log("ROLE_UPGRADE_ADDRESS:", ROLE_UPGRADE_ADDRESS || "❌ Not set");

  // If we have addresses, check their status
  if (USER_MANAGEMENT_ADDRESS && ROLE_UPGRADE_ADDRESS) {
    try {
      console.log("\n🔗 Connecting to contracts...");

      // Connect to UserManagement contract
      const UserManagement = await ethers.getContractFactory("UserManagement");
      const userManagement = UserManagement.attach(USER_MANAGEMENT_ADDRESS);

      // Check deployer role
      const deployerRole = await userManagement.getUserRole(deployer.address);
      console.log("👤 Deployer role:", deployerRole.toString(), "(4 = Admin)");

      // Check if RoleUpgrade is authorized
      const isAuthorized = await userManagement.authorizedContracts(ROLE_UPGRADE_ADDRESS);
      console.log("🔐 RoleUpgrade authorized:", isAuthorized ? "✅ Yes" : "❌ No");

      if (deployerRole.toString() === "4" && !isAuthorized) {
        console.log("\n💡 Ready to run authorization script!");
        console.log("Run: npx hardhat run scripts/authorize-contracts.js --network sepolia");
      } else if (isAuthorized) {
        console.log("\n✅ RoleUpgrade is already authorized!");
      } else if (deployerRole.toString() !== "4") {
        console.log("\n❌ Deployer is not admin. Cannot authorize contracts.");
        console.log("Current role:", deployerRole.toString(), "(need 4 for Admin)");
      } else {
        console.log("\n✅ Everything looks good!");
      }

    } catch (error) {
      console.error("❌ Error connecting to contracts:", error.message);
    }
  } else {
    console.log("\n💡 To get contract addresses:");
    console.log("1. Check your deployment logs");
    console.log("2. Set environment variables:");
    console.log("   export USER_MANAGEMENT_ADDRESS=0x...");
    console.log("   export ROLE_UPGRADE_ADDRESS=0x...");
    console.log("3. Or hardcode them in scripts/authorize-contracts.js");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
