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

    // Map request id to recipient address to encrypted AES key bytes
    mapping(string => mapping(address => bytes)) public encryptedKeys;

    //map address of patient to the recordIDs
    mapping(address => string[]) public patientRecordIDs;

    //map address of doctor to the record they created
    mapping(address => MedicalRecord[]) public doctorMedicalRecord;

    // Reference to user management contract
    address public userManagementContract;

    address[] private patientList;
    
    event RecordUpdated(address indexed patientAddress, address indexed updatedBy, string medicalRecordID, string newCid, string updateReason, uint timestamp);
    event RecordAdded(address indexed patientAddress, address indexed doctor, string medicalRecordID, string cid, string recordType, uint timestamp);
    event KeyStored(address indexed user, string medicalRecordID, uint timestamp);

    constructor(address _userManagementContract) {
        userManagementContract = _userManagementContract;
    }

    function addMedicalRecord(
        address patientAddress,
        string memory medicalRecordID,
        string calldata cid,
        bytes calldata encryptedKeyForPatient,
        string memory recordType
    ) external {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.HealthcareProvider, "Only doctors can add records");
        require(IUserManagement(userManagementContract).getUserRole(patientAddress) == userRole.Patient, "Target must be a patient");
        require(bytes(medicalRecordID).length > 0, "Medical record ID required");
        require(bytes(patientMedicalRecord[patientAddress][medicalRecordID].medicalRecordID).length == 0, "Record already exists");

        patientMedicalRecord[patientAddress][medicalRecordID] = MedicalRecord({
            patientAddress: patientAddress,
            medicalRecordID: medicalRecordID,
            cid: cid,
            recordType: recordType,
            createdAt: block.timestamp
        });

        encryptedKeys[medicalRecordID][patientAddress] = encryptedKeyForPatient;
        patientRecordIDs[patientAddress].push(medicalRecordID);
        doctorMedicalRecord[msg.sender].push(MedicalRecord({
            patientAddress: patientAddress,
            medicalRecordID: medicalRecordID,
            cid: cid,
            recordType: recordType,
            createdAt: block.timestamp
        }));

        recordCount[patientAddress]++;

        emit RecordAdded(patientAddress, msg.sender, medicalRecordID, cid, recordType, block.timestamp);
    }

    function getCreatedRecords(address doctorAddress) external view returns (MedicalRecord[] memory){
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.HealthcareProvider, "Only doctor are allowed to get their own created records");
        return doctorMedicalRecord[doctorAddress];
    }

    function updateRecord(
        address patientAddress, 
        string memory medicalRecordID, 
        string memory newCid, 
        string memory updateReason,
        address accessControlContract,
        bytes calldata encryptedKeyForPatient
    ) external {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.HealthcareProvider, "Only doctors are allowed to update records");
        require(IUserManagement(userManagementContract).getUserRole(patientAddress) == userRole.Patient, "Target must be a patient");
        require(IUserManagement(userManagementContract).users(patientAddress).isActive == true, "Patient account must be active");
        require(bytes(patientMedicalRecord[patientAddress][medicalRecordID].medicalRecordID).length > 0, "Medical Record should exist");
        require(IAccessControl(accessControlContract).accessControl(patientAddress, msg.sender, medicalRecordID), "No access to this record");
        require(bytes(newCid).length > 0, "New CID required");


        // Update the CID to point to new encrypted document
        patientMedicalRecord[patientAddress][medicalRecordID].cid = newCid;

        // Update encrypted key for patient with new AES key
        encryptedKeys[medicalRecordID][patientAddress] = encryptedKeyForPatient;

        // Record update in history
        updateHistory[patientAddress][medicalRecordID].push(
            UpdateHistory("cid", keccak256(bytes(newCid)), msg.sender, block.timestamp, updateReason)
        ); 
        
        emit RecordUpdated(patientAddress, msg.sender, medicalRecordID, newCid, updateReason, block.timestamp);
    }

    function getRecordHash(address patientAddress, string memory medicalRecordID) external view returns (bytes32){
        require(bytes(patientMedicalRecord[patientAddress][medicalRecordID].medicalRecordID).length > 0, "Medical Record should exist");
        MedicalRecord memory record = patientMedicalRecord[patientAddress][medicalRecordID];

        return keccak256(abi.encodePacked(
            record.medicalRecordID,
            record.patientAddress,
            record.cid
        ));
    }

    function getRecordHistory(address patientAddress, string memory medicalRecordID, address accessControlContract) external view returns (UpdateHistory[] memory){
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient ||  IAccessControl(accessControlContract).accessControl(patientAddress, msg.sender, medicalRecordID), "No authorized access to view history");

        return updateHistory[patientAddress][medicalRecordID];
    }

    function getMedicalRecord(address patient, string memory recordId) external view returns (MedicalRecord memory) {
      require(bytes(patientMedicalRecord[patient][recordId].medicalRecordID).length > 0, "Record does not exist");
      return patientMedicalRecord[patient][recordId];
    }

    function recordExists(address patient, string memory recordId) external view returns (bool) {
        return bytes(patientMedicalRecord[patient][recordId].medicalRecordID).length > 0;
    }

    function shareMedicalRecord(address patient, string memory medicalRecordId, address to, address accessControlContract, bytes calldata encryptedKeyForRecipient) external {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient, "Only patients can share records");
        require(bytes(patientMedicalRecord[patient][medicalRecordId].medicalRecordID).length > 0 , "Record does not exist");
        require(patient == msg.sender, "Patients can only share their own records");

        IAccessControl(accessControlContract).grantAccess(patient, to, medicalRecordId);

        // Store encrypted key for the recipient
        encryptedKeys[medicalRecordId][to] = encryptedKeyForRecipient;

        emit KeyStored(to, medicalRecordId, block.timestamp);

    }

    // Get encrypted key for caller (patient or doctor with access)
    function getEncryptedKey(string memory medicalRecordId, address patientAddress, address accessControlContract) external view returns (bytes memory) {
        require(bytes(patientMedicalRecord[patientAddress][medicalRecordId].medicalRecordID).length > 0, "Record does not exist");
        
        // Check if caller is the patient or has access
        require(
            msg.sender == patientAddress || 
            IAccessControl(accessControlContract).accessControl(patientAddress, msg.sender, medicalRecordId),
            "No access to this record"
        );
        
        return encryptedKeys[medicalRecordId][msg.sender];
    }

    function getEncryptedKeyForPatient(string memory _medicalRecordId, address _patient) external view returns (bytes memory) {
        require(msg.sender == _patient, "Only the patient can retrieve their own key");
        return encryptedKeys[_medicalRecordId][_patient];
    }

    function getPatientRecordIDs(address patient) external view returns (string[] memory) {
        return patientRecordIDs[patient];
    }
}