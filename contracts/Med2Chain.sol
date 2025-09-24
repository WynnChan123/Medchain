// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// bytes32 public constant Insurer = keccak256("Insurer");
// bytes32 public constant Admin = keccak256("Admin");


contract Med2Chain{
    using ECDSA for bytes32;
    bytes32 public hashedDeployerId;

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
        string firstName;
        string lastName;
        string dateOfBirth;
        string gender;
        string email;
        string phoneNumber;
        string houseAddress;
        string city;
        string state;
        string zipCode;
        string country;
        uint256 lastUpdated;
    }

    address public admin;
    address[] public userAddresses;
    bool public accessGranted;

    mapping(bytes32 => User) public encryptedIdToUser;
    mapping(address => User) public users;
    mapping(address => PatientProfile) public patients;
    mapping(address => mapping(address => bool)) public accessControl;
    mapping(address => address[]) public grantedPeople;

    event UserRegistered(address indexed walletAddress, userRole role, address authorizedBy);
    event UpdatePatientProfile(address indexed patientAddress, uint256 timestamp);
    event GrantAccess(address indexed patientAddress, address indexed thirdPartyAddress, uint timestamp);
    event RevokeAccess(address indexed patientAddress, address indexed thirdPartyAddress, uint timestamp);
                                                                                                         
    constructor(bytes32 _hashedId) {
        admin = msg.sender;
        hashedDeployerId = _hashedId;

        // Register the deployer as admin
        users[msg.sender] = User({
            role: userRole.Admin,
            encryptedId: hashedDeployerId,
            createdAt: block.timestamp,
            isActive: true,
            walletAddress: msg.sender,
            authorizedBy: msg.sender
        });

        encryptedIdToUser[hashedDeployerId] = users[msg.sender];
        userAddresses.push(msg.sender);
    }

    function registerUser(
        address walletAddress,
        bytes32 encryptedId,
        userRole role
    ) external {
        require(users[walletAddress].walletAddress == address(0), "User already registered");
        require(encryptedId != bytes32(0), "Encrypted ID required");

        if(role == userRole.Patient){
            users[walletAddress] = User({
                role: userRole.Patient,
                createdAt: block.timestamp,
                encryptedId: encryptedId,
                isActive: true,
                walletAddress: walletAddress,
                authorizedBy: walletAddress
            });

        }else{
            require(users[msg.sender].role == userRole.Admin, "Only admin can register users");
            users[walletAddress] = User({
                role: role,
                createdAt: block.timestamp,
                encryptedId: encryptedId,
                isActive: true,
                walletAddress: walletAddress,
                authorizedBy: msg.sender
            });
        }

        encryptedIdToUser[encryptedId] = users[walletAddress];  //map the user data to the encrypted ID

        userAddresses.push(walletAddress);
        emit UserRegistered(walletAddress, role, role == userRole.Patient? walletAddress: msg.sender);
    }

    function isUserAdmin(
        address walletAddress
    ) public view returns (bool) {
        return users[walletAddress].role == userRole.Admin;
    }

    function isUserPatient(
        address walletAddress
    ) public view returns (bool) {
        return users[walletAddress].role == userRole.Patient;
    }

    function isUserInsurer(
        address walletAddress
    ) public view returns (bool) {
        return users[walletAddress].role == userRole.Insurer;
    }

    function isUserHealthcareProvider(
        address walletAddress
    ) public view returns (bool) {
        return users[walletAddress].role == userRole.HealthcareProvider;
    }

    function getAllUsers() public view returns (User[] memory){
        User[] memory allUsers = new User[](userAddresses.length);
        for(uint i = 0; i < userAddresses.length; i++){
            allUsers[i] = users[userAddresses[i]];
        }

        return allUsers;
    }

    //Allows patients to update their information
    //Parameters: walletAddress, 
    function updatePatientProfile(
        string memory firstName, 
        string memory lastName,
        string memory dateOfBirth,
        string memory gender,
        string memory email,
        string memory phoneNumber,
        string memory houseAddress,
        string memory city,
        string memory state,
        string memory zipCode,
        string memory country
    ) external {
        require(users[msg.sender].role == userRole.Patient, "Only patients can update their profile");
        require(users[msg.sender].isActive == true, "Only active patients can update their profile");
        require(bytes(firstName).length > 0, "Field of first name cannot be left blank");
        require(bytes(lastName).length > 0, "Field of last name cannot be left blank");
        require(bytes(dateOfBirth).length > 0, "Field of date of birth cannot be left blank");
        require(bytes(gender).length > 0, "Field of gender cannot be left blank");
        require(bytes(email).length > 0, "Field of email cannot be left blank");
        require(bytes(phoneNumber).length > 0, "Field of phone number cannot be left blank");
        require(bytes(houseAddress).length > 0, "Field of house address cannot be left blank");
        require(bytes(city).length > 0, "Field of city cannot be left blank");
        require(bytes(state).length > 0, "Field of state cannot be left blank");
        require(bytes(zipCode).length > 0, "Field of zip code cannot be left blank");
        require(bytes(country).length > 0, "Field of country cannot be left blank");

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

    function grantAccess(address walletAddress) external {
        require(users[msg.sender].role == userRole.Patient, "Only patients are allowed to grant access to third parties");
        require(!accessControl[msg.sender][walletAddress], "Access already granted to this wallet address");

        accessControl[msg.sender][walletAddress] = true;
        grantedPeople[msg.sender].push(walletAddress);

        emit GrantAccess(msg.sender, walletAddress, block.timestamp);
    }

    function revokeAccess(address walletAddress) external {
        require(users[msg.sender].role == userRole.Patient, "Only patients are allowed to revoke access from third parties");
        require(accessControl[msg.sender][walletAddress], "No access granted to this wallet address");

        accessControl[msg.sender][walletAddress] = false;

        address[] storage grantedPeopleArray = grantedPeople[msg.sender];

        for (uint i = 0; i < grantedPeopleArray.length; i++) {
            if (grantedPeopleArray[i] == walletAddress) {
                grantedPeopleArray[i] = grantedPeopleArray[grantedPeopleArray.length - 1];
                grantedPeopleArray.pop();
                break;
            }
        }

        emit RevokeAccess(msg.sender, walletAddress, block.timestamp);
    }

    function checkWhoHasAccess() external view returns(address[] memory) {
        require(users[msg.sender].role == userRole.Patient, "Only patients are allowed to check who has access of their documents");

        return grantedPeople[msg.sender];
    }
}