//PatientProfile.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./Med2Chain.sol";


contract PatientProfileManagement is Med2ChainStructs {
    
    mapping(address => PatientProfile) public patients;
    
    // Reference to user management contract
    address public userManagementContract;
    
    event UpdatePatientProfile(address indexed patientAddress, uint256 timestamp);
    
    constructor(address _userManagementContract) {
        userManagementContract = _userManagementContract;
    }
    
    modifier onlyPatient() {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient, "Only patients can update their profile");
        require(IUserManagement(userManagementContract).users(msg.sender).isActive == true, "Only active patients can update their profile");
        _;
    }

    //Allows patients to update their information
    //Parameters: walletAddress, 
    function updatePatientProfile(
        bytes32 firstName, 
        bytes32 lastName,
        bytes32 dateOfBirth,
        bytes32 gender,
        bytes32 email,
        bytes32 phoneNumber,
        bytes32 houseAddress,
        bytes32 city,
        bytes32 state,
        bytes32 zipCode,
        bytes32 country
    ) external onlyPatient {
        patients[msg.sender] = PatientProfile({
            firstName: firstName,
            lastName: lastName,
            dateOfBirth: dateOfBirth,
            gender: gender,
            email: email,
            phoneNumber: phoneNumber,
            houseAddress: houseAddress,
            city: city,
            state: state,
            zipCode: zipCode,
            country: country,
            lastUpdated: block.timestamp
        });

        emit UpdatePatientProfile(msg.sender, block.timestamp);
    }
}