// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Med2Chain.sol";
import "./UserRegistry.sol";
import "./MedicalRecords.sol";
import "./AccessControl.sol";
import "./RoleUpgrade.sol";

contract HealthcareSystem is Med2ChainStructs {
    UserManagement private userRegistry;
    MedicalRecordsManagement private medicalRecords;
    AccessControlManagement private accessControl;
    RoleUpgrade private roleUpgrade;

    constructor(
        address _userRegistry,
        address _medicalRecords,
        address _accessControl,
        address _roleUpgrade
    ) {
        userRegistry = UserManagement(_userRegistry);
        medicalRecords = MedicalRecordsManagement(_medicalRecords);
        accessControl = AccessControlManagement(_accessControl);
        roleUpgrade = RoleUpgrade(_roleUpgrade);
    }

    // Example wrapper: Register user via HealthcareSystem
    function registerUser(
        address wallet,
        bytes32 encryptedId,
        userRole role
    ) external {
        userRegistry.registerUserFromSystem(msg.sender, wallet, encryptedId, role);
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

    //Wrapper for checking if user exists
    function userExists(address user) external view returns (bool) {
        return userRegistry.userExists(user);
    }

    function submitUpgradeRequest(address patient, string calldata cid, address[] calldata admins, userRole newRole, bytes[] calldata encryptedKeys) external {
        roleUpgrade.submitUpgradeRequest(patient, cid, newRole, admins, encryptedKeys);
    }

    function approveRequest(uint _requestId, address userToUpgrade) external {
        roleUpgrade.approveRequest(_requestId, userToUpgrade);
    }

    function rejectRequest(uint _requestId) external {
        roleUpgrade.rejectRequest(_requestId);
    }

    function getEncryptedKeyForCaller(uint _requestId) external view returns (bytes memory) {
        return roleUpgrade.getEncryptedKeyForCaller(_requestId);
    }
}

