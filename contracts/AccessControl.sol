//AccessControl.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./Med2Chain.sol";


contract AccessControlManagement is Med2ChainStructs {
    
    // people granted access to a medical record
    mapping(address => mapping(string => address[])) public grantedPeople;
    //map address to whether or not third party has access to the record ID
    mapping(address => mapping(address => mapping(string => bool))) public accessControl;
    //mapping: patient -> recipient -> recordId -> encrypted AES Key
    mapping(address => mapping(address => mapping(string => bytes))) private encryptedKeys;
    //map address to track records shared with each user
    mapping(address => SharedRecordInfo[]) private sharedWithUser;

    struct SharedRecordInfo{
        address patientAddress;
        string recordId;
        uint256 timestamp;
    }
    
    // Reference to user management and medical records contracts
    address public userManagementContract;
    address public medicalRecordsContract;
    
    bool public accessGranted;
    uint256 public numOfRecord;
    
    event GrantAccess(address indexed patientAddress, address indexed thirdPartyAddress, uint timestamp);
    event RevokeAccess(address indexed patientAddress, address indexed thirdPartyAddress, uint timestamp);
    event EncryptedKeyStored(
    address indexed patient,
    address indexed recipient,
    string recordId,
    uint timestamp
    );

    constructor(address _userManagementContract, address _medicalRecordsContract) {
        userManagementContract = _userManagementContract;
        medicalRecordsContract = _medicalRecordsContract;
    }

    function grantAccess(address patientAddress, address walletAddress, string memory medicalRecordID) external {
        //criteria for granting access to users: only patients can grant access and medical record needs to exist
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient || msg.sender == medicalRecordsContract, "Only patients are allowed to grant access to third parties");
        // Security: If called by a patient directly (not via medicalRecordsContract), ensure they can only grant access to their own records
        if (msg.sender != medicalRecordsContract) {
            require(msg.sender == patientAddress, "Patients can only grant access to their own records");
        }
        require(IMedicalRecords(medicalRecordsContract).recordExists(patientAddress, medicalRecordID), "Patient record does not exist");
        require(!accessControl[patientAddress][walletAddress][medicalRecordID], "Access already granted");
        require(IUserManagement(userManagementContract).users(walletAddress).isActive, "Target user is not active");

        accessControl[patientAddress][walletAddress][medicalRecordID] = true;
        grantedPeople[patientAddress][medicalRecordID].push(walletAddress);

        sharedWithUser[walletAddress].push(SharedRecordInfo({
            patientAddress: patientAddress,
            recordId: medicalRecordID,
            timestamp: block.timestamp
        }));

        emit GrantAccess(patientAddress, walletAddress, block.timestamp);
    }

    function getSharedRecords(address user) external view returns (SharedRecordInfo[] memory) {
        return sharedWithUser[user];
    }

    function getSharedRecordCount(address user) external view returns (uint256) {
        return sharedWithUser[user].length;
    }

    function revokeAccess(address patientAddress, address walletAddress, string memory medicalRecordID) external {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient || msg.sender == medicalRecordsContract, "Only patients are allowed to revoke access from third parties");
        // Security: If called by a patient directly (not via medicalRecordsContract), ensure they can only revoke access from their own records
        if (msg.sender != medicalRecordsContract) {
            require(msg.sender == patientAddress, "Patients can only revoke access from their own records");
        }
        require(IMedicalRecords(medicalRecordsContract).recordExists(patientAddress, medicalRecordID), "Patient record does not exist");

        accessControl[patientAddress][walletAddress][medicalRecordID] = false;

        address[] storage grantedPeopleArray = grantedPeople[patientAddress][medicalRecordID];

        for (uint i = 0; i < grantedPeopleArray.length; i++) {
            if (grantedPeopleArray[i] == walletAddress) {
                grantedPeopleArray[i] = grantedPeopleArray[grantedPeopleArray.length - 1];
                grantedPeopleArray.pop();
                break;
            }
        }

            SharedRecordInfo[] storage userSharedRecords = sharedWithUser[walletAddress];
            for (uint i = 0; i < userSharedRecords.length; i++) {
                if (userSharedRecords[i].patientAddress == patientAddress && 
                    keccak256(bytes(userSharedRecords[i].recordId)) == keccak256(bytes(medicalRecordID))) {
                    userSharedRecords[i] = userSharedRecords[userSharedRecords.length - 1];
                    userSharedRecords.pop();
                    break;
                }
            }

        emit RevokeAccess(patientAddress, walletAddress, block.timestamp);
    }

    function checkWhoHasAccess(string memory medicalRecordID) external view returns(address[] memory) {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient, "Only patients are allowed to check who has access of their documents");

        return grantedPeople[msg.sender][medicalRecordID];
    }

    function storeEncryptedAESKey(address patientAddress, address recipient, string memory recordId, bytes memory encryptedAESKey) external {
        require(bytes(encryptedAESKey).length > 0, "Key cannot be empty");
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient || msg.sender == medicalRecordsContract, "Only patients are allowed to share their AES Key");
        require(
        IUserManagement(userManagementContract).users(recipient).isActive,
        "Recipient is not active");

        if (msg.sender != medicalRecordsContract) {
            require(msg.sender == patientAddress, "Patients can only revoke access from their own records");
        }
        
        encryptedKeys[patientAddress][recipient][recordId] = encryptedAESKey;

        emit EncryptedKeyStored(patientAddress, recipient, recordId, block.timestamp);
    }

    function getEncryptedAESKey(address patientAddress, address recipient, string memory recordId) public view returns (bytes memory){
        require(accessControl[patientAddress][recipient][recordId], "Only insurers, doctors, and patients can get a patient's encrypted AES Key");
        return encryptedKeys[patientAddress][recipient][recordId];
    }
}