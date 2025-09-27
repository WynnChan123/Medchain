//Med2Chain.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

abstract contract Med2ChainStructs {
    enum userRole{
        Patient,
        HealthcareProvider,
        Insurer,
        Admin
    }
    struct User{
        userRole role;
        bytes32 encryptedId;
        uint256 createdAt;
        bool isActive;
        address walletAddress;
        address authorizedBy;
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
        string medicalRecordID;
        string patientName;
        string dateOfBirth;
        string gender;
        string phoneNumber;
        string houseAddress;
        string medicalHistory;
        string recordType;
        string ipfsHash;
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
    }

    interface IMedicalRecords {
        function patientMedicalRecord(address patient, string memory recordId) external view returns (Med2ChainStructs.MedicalRecord memory);
    }

    interface IAccessControl {
        function accessControl(address patient, address requester, string memory recordId) external view returns (bool);
    }