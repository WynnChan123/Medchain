const { ethers } = require("hardhat");

async function main() {
  // 1. Deploy UserRegistry
  const UserManagement = await ethers.getContractFactory("UserManagement");
  const userManagement = await UserManagement.deploy();
  await userManagement.waitForDeployment();
  console.log("UserManagement deployed to:", await userManagement.getAddress());

  const MedicalRecordsManagement = await ethers.getContractFactory("MedicalRecordsManagement");
  const medicalRecords = await MedicalRecordsManagement.deploy(
    await userManagement.getAddress()
  );
  await medicalRecords.waitForDeployment();
  console.log("MedicalRecordsManagement deployed to:", await medicalRecords.getAddress());

  // 3. Deploy AccessControl
  const AccessControlManagement = await ethers.getContractFactory("AccessControlManagement");
  const accessControl = await AccessControlManagement.deploy(
    await userManagement.getAddress(),
    await medicalRecords.getAddress()
  );
  await accessControl.waitForDeployment();
  console.log("AccessControlManagement deployed to:", await accessControl.getAddress());

  const RoleUpgrade = await ethers.getContractFactory("RoleUpgrade");
  const roleUpgrade = await RoleUpgrade.deploy(
    await userManagement.getAddress(),
    await medicalRecords.getAddress(),
  );
  await roleUpgrade.waitForDeployment();
  console.log("RoleUpgrade deployed to:", await roleUpgrade.getAddress());

  // Authorize RoleUpgrade contract to call UserManagement
  console.log("Authorizing RoleUpgrade contract...");
  await userManagement.authorizeContract(await roleUpgrade.getAddress());
  console.log("RoleUpgrade contract authorized");

  const requestClaim = await ethers.getContractFactory("ClaimRequest");
  const claimContract = await requestClaim.deploy(
    await userManagement.getAddress(),
    await medicalRecords.getAddress(),
    await accessControl.getAddress()
  );
  await claimContract.waitForDeployment();
  console.log("RequestClaim deployed to:", await claimContract.getAddress());

  const HealthcareSystem = await ethers.getContractFactory("HealthcareSystem");
  const healthcareSystem = await HealthcareSystem.deploy(
    await userManagement.getAddress(),
    await medicalRecords.getAddress(),
    await accessControl.getAddress(),
    await roleUpgrade.getAddress(),
    await claimContract.getAddress()
  );
  await healthcareSystem.waitForDeployment();
  console.log("HealthcareSystem deployed to:", await healthcareSystem.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
