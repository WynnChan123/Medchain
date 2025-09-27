// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Med2Chain.sol";
import "./UserRegistry.sol";
import "./MedicalRecords.sol";
import "./AccessControl.sol";

contract HealthcareSystem is Med2ChainStructs {
    UserManagement private userRegistry;
    MedicalRecordsManagement private medicalRecords;
    AccessControlManagement private accessControl;

    constructor(
        address _userRegistry,
        address _medicalRecords,
        address _accessControl
    ) {
        userRegistry = UserManagement(_userRegistry);
        medicalRecords = MedicalRecordsManagement(_medicalRecords);
        accessControl = AccessControlManagement(_accessControl);
    }

    // Example wrapper: Register user via HealthcareSystem
    function registerUser(
        address wallet,
        bytes32 encryptedId,
        userRole role
    ) external {
        userRegistry.registerUser(wallet, encryptedId, role);
    }

    // Example wrapper: Get a medical record if access is allowed
    function getMedicalRecord(
        address patient,
        string memory recordId
    ) external view returns (MedicalRecord memory) {
        require(
            accessControl.accessControl(patient, msg.sender, recordId),
            "Access denied"
        );
        return medicalRecords.getMedicalRecord(patient, recordId);
    }

    // Wrapper for checking roles
    function getUserRole(address user) external view returns (userRole) {
        return userRegistry.getUserRole(user);
    }
}
