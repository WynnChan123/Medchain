const { ethers } = require("hardhat");

async function main() {
  // Get contract addresses from environment variables or hardcode them
  const USER_MANAGEMENT_ADDRESS = process.env.USER_MANAGEMENT_ADDRESS;
  const ROLE_UPGRADE_ADDRESS = process.env.ROLE_UPGRADE_ADDRESS;

  // Check if addresses are still placeholder
  if (USER_MANAGEMENT_ADDRESS === "0x..." || ROLE_UPGRADE_ADDRESS === "0x...") {
    console.error("❌ Please update the contract addresses in this script!");
    console.error("You can find them in your deployment logs or environment variables.");
    console.error("USER_MANAGEMENT_ADDRESS:", USER_MANAGEMENT_ADDRESS);
    console.error("ROLE_UPGRADE_ADDRESS:", ROLE_UPGRADE_ADDRESS);
    return;
  }

  console.log("UserManagement contract address:", USER_MANAGEMENT_ADDRESS);
  console.log("RoleUpgrade contract address:", ROLE_UPGRADE_ADDRESS);

  // Get the deployer account (should be admin)
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Connect to UserManagement contract
  const UserManagement = await ethers.getContractFactory("UserManagement");
  const userManagement = UserManagement.attach(USER_MANAGEMENT_ADDRESS);

  // Check if deployer is admin
  const deployerRole = await userManagement.getUserRole(deployer.address);
  console.log("Deployer role:", deployerRole.toString());
  console.log("Role names: 0=Unregistered, 1=Patient, 2=HealthcareProvider, 3=Insurer, 4=Admin");

  if (deployerRole.toString() !== "4") { // 4 is Admin role
    console.error("❌ Deployer is not an admin! Cannot authorize contracts.");
    console.error("Current role:", deployerRole.toString(), "(4 = Admin)");
    return;
  }

  console.log("✅ Deployer is admin, proceeding with authorization...");

  // Check if already authorized
  const isAlreadyAuthorized = await userManagement.authorizedContracts(ROLE_UPGRADE_ADDRESS);
  if (isAlreadyAuthorized) {
    console.log("✅ RoleUpgrade contract is already authorized!");
    return;
  }

  // Authorize RoleUpgrade contract
  console.log("🔐 Authorizing RoleUpgrade contract...");
  const tx = await userManagement.authorizeContract(ROLE_UPGRADE_ADDRESS);
  console.log("⏳ Waiting for transaction confirmation...");
  await tx.wait();

  console.log("✅ RoleUpgrade contract authorized successfully!");
  console.log("📄 Transaction hash:", tx.hash);

  // Verify authorization
  const isAuthorized = await userManagement.authorizedContracts(ROLE_UPGRADE_ADDRESS);
  console.log("🔍 Verification - RoleUpgrade is authorized:", isAuthorized);

  if (isAuthorized) {
    console.log("🎉 SUCCESS! The authorization script worked correctly.");
    console.log("You can now test role approvals in your frontend.");
  } else {
    console.log("❌ ERROR: Authorization failed. Please check the transaction.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
