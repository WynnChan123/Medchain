//Med2Chain.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

abstract contract Med2ChainStructs {
    enum userRole{
        Unregistered,
        Patient,
        HealthcareProvider,
        Insurer,
        Admin
    }
    struct User{
        bytes32 encryptedId;
        uint256 createdAt;
        bool isActive;
        address walletAddress;
        address authorizedBy;
        bool isWalletRegistered;
    }

    struct PatientProfile{
        bytes32 firstName;
        bytes32 lastName;
        bytes32 dateOfBirth;
        bytes32 gender;
        bytes32 email;
        bytes32 phoneNumber;
        bytes32 houseAddress;
        bytes32 city;
        bytes32 state;
        bytes32 zipCode;
        bytes32 country;
        uint256 lastUpdated;
    }

    struct MedicalRecord{
        address patientAddress;
        string medicalRecordID;
        string cid;
    }

    struct UpdateHistory{
        string fieldUpdated;
        bytes32 valueHash;
        address updatedBy;
        uint256 timestamp;
        string updateReason;
    }

}

interface IUserManagement {
    function getUserRole(address user) external view returns (Med2ChainStructs.userRole);
    function users(address user) external view returns (Med2ChainStructs.User memory);
    function setUserRole(address user, Med2ChainStructs.userRole) external;
}

interface IMedicalRecords {
    function patientMedicalRecord(address patient, string memory recordId) external view returns (Med2ChainStructs.MedicalRecord memory);
    function recordExists(address patient, string memory recordId) external view returns (bool);
}

interface IAccessControl {
    function accessControl(address patient, address requester, string memory recordId) external view returns (bool);
    function grantAccess(address patient, address to, string memory recordId) external;
    function revokeAccess(address patient, address to, string memory recordId) external;
}

// interface IRoleUpgrade {
//     function getEncryptedKeyForCaller(uint _requestId) external view returns (bytes memory);
// }