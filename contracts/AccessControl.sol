//AccessControl.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./Med2Chain.sol";


contract AccessControlManagement is Med2ChainStructs {
    
    // people granted access to a medical record
    mapping(address => mapping(string => address[])) public grantedPeople;
    //map address to whether or not third party has access to the record ID
    mapping(address => mapping(address => mapping(string => bool))) public accessControl;
    
    // Reference to user management and medical records contracts
    address public userManagementContract;
    address public medicalRecordsContract;
    
    bool public accessGranted;
    uint256 public numOfRecord;
    
    event GrantAccess(address indexed patientAddress, address indexed thirdPartyAddress, uint timestamp);
    event RevokeAccess(address indexed patientAddress, address indexed thirdPartyAddress, uint timestamp);
    
    constructor(address _userManagementContract, address _medicalRecordsContract) {
        userManagementContract = _userManagementContract;
        medicalRecordsContract = _medicalRecordsContract;
    }

    function grantAccess(address walletAddress, string memory medicalRecordID) external {
        //criteria for granting access to users: only patients can grant access and medical record needs to exist
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient, "Only patients are allowed to grant access to third parties");
        require(bytes(IMedicalRecords(medicalRecordsContract).patientMedicalRecord(msg.sender, medicalRecordID).medicalRecordID).length > 0, "Patient record does not exist");
        require(!accessControl[msg.sender][walletAddress][medicalRecordID], "Access already granted");
        require(IUserManagement(userManagementContract).users(walletAddress).isActive, "Target user is not active");

        accessControl[msg.sender][walletAddress][medicalRecordID] = true;
        grantedPeople[msg.sender][medicalRecordID].push(walletAddress);

        emit GrantAccess(msg.sender, walletAddress, block.timestamp);
    }

    function revokeAccess(address walletAddress, string memory medicalRecordID) external {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient, "Only patients are allowed to revoke access from third parties");
        require(bytes(IMedicalRecords(medicalRecordsContract).patientMedicalRecord(msg.sender, medicalRecordID).medicalRecordID).length > 0, "Patient record does not exist");

        accessControl[msg.sender][walletAddress][medicalRecordID] = false;

        address[] storage grantedPeopleArray = grantedPeople[msg.sender][medicalRecordID];

        for (uint i = 0; i < grantedPeopleArray.length; i++) {
            if (grantedPeopleArray[i] == walletAddress) {
                grantedPeopleArray[i] = grantedPeopleArray[grantedPeopleArray.length - 1];
                grantedPeopleArray.pop();
                break;
            }
        }

        emit RevokeAccess(msg.sender, walletAddress, block.timestamp);
    }

    function checkWhoHasAccess(string memory medicalRecordID) external view returns(address[] memory) {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient, "Only patients are allowed to check who has access of their documents");

        return grantedPeople[msg.sender][medicalRecordID];
    }
}