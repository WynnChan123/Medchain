//MedicalRecords.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./Med2Chain.sol";

contract MedicalRecordsManagement is Med2ChainStructs {
    
    //map address to medicalrecord
    mapping(address => mapping(string => MedicalRecord)) public patientMedicalRecord;
    //track how many records each patient has
    mapping(address=> uint) public recordCount;
    //map address of patient to the updated record history of the record
    mapping(address=> mapping(string => UpdateHistory[])) public updateHistory;
    
    // Reference to user management contract
    address public userManagementContract;
    
    event RecordUpdated(address indexed patientAddress, address indexed updatedBy, string fieldToUpdate, string updateReason, uint timestamp);
    
    constructor(address _userManagementContract) {
        userManagementContract = _userManagementContract;
    }

    function addMedicalRecord(
        string memory medicalRecordID,
        string memory patientName,
        string memory dateOfBirth,
        string memory gender,
        string memory phoneNumber,
        string memory houseAddress,
        string memory medicalHistory,
        string memory recordType,
        string memory ipfsHash
    ) external {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient, "Only patients can add records");
        require(bytes(medicalRecordID).length > 0, "Medical record ID required");
        require(bytes(patientMedicalRecord[msg.sender][medicalRecordID].medicalRecordID).length == 0, "Record already exists");

        patientMedicalRecord[msg.sender][medicalRecordID] = MedicalRecord({
            medicalRecordID: medicalRecordID,
            patientName: patientName,
            dateOfBirth: dateOfBirth,
            gender: gender,
            phoneNumber: phoneNumber,
            houseAddress: houseAddress,
            medicalHistory: medicalHistory,
            recordType: recordType,
            ipfsHash: ipfsHash
        });

        recordCount[msg.sender]++;
    }

    function updateRecord(
        address patientAddress, 
        string memory medicalRecordID, 
        string memory newValue, 
        string memory updateReason,
        string memory fieldToUpdate,
        address accessControlContract
    ) external {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.HealthcareProvider, "Only doctors are allowed to update records");
        require(IUserManagement(userManagementContract).getUserRole(patientAddress) == userRole.Patient, "Target must be a patient");
        require(IUserManagement(userManagementContract).users(patientAddress).isActive == true, "Patient account must be active");
        require(bytes(patientMedicalRecord[patientAddress][medicalRecordID].medicalRecordID).length > 0, "Medical Record should exist");
        require(IAccessControl(accessControlContract).accessControl(patientAddress, msg.sender, medicalRecordID), "No access to this record");

        if(keccak256(bytes(fieldToUpdate)) == keccak256(bytes("medicalHistory"))){
            patientMedicalRecord[patientAddress][medicalRecordID].medicalHistory = newValue;
        } else if(keccak256(bytes(fieldToUpdate)) == keccak256(bytes("recordType"))){
            patientMedicalRecord[patientAddress][medicalRecordID].recordType = newValue;
        }else{
            revert("Field cannot be updated");
        }

        updateHistory[patientAddress][medicalRecordID].push(UpdateHistory(fieldToUpdate, keccak256(bytes(newValue)), msg.sender, block.timestamp, updateReason)); 
        emit RecordUpdated(patientAddress, msg.sender, fieldToUpdate, updateReason, block.timestamp);
    }

    function getRecordHash(address patientAddress, string memory medicalRecordID) external view returns (bytes32){
        require(bytes(patientMedicalRecord[patientAddress][medicalRecordID].medicalRecordID).length > 0, "Medical Record should exist");
        MedicalRecord memory record = patientMedicalRecord[patientAddress][medicalRecordID];

        return keccak256(abi.encodePacked(
            record.medicalRecordID,
            record.patientName,
            record.dateOfBirth,
            record.gender,
            record.phoneNumber,
            record.houseAddress,
            record.medicalHistory,
            record.recordType,
            record.ipfsHash
        ));
    }

    function getRecordHistory(address patientAddress, string memory medicalRecordID, address accessControlContract) external view returns (UpdateHistory[] memory){
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient ||  IAccessControl(accessControlContract).accessControl(patientAddress, msg.sender, medicalRecordID), "No authorized access to view history");

        return updateHistory[patientAddress][medicalRecordID];
    }
}