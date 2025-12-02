//UserRegistry.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./Med2Chain.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol"; 

contract UserManagement is Med2ChainStructs {
    using ECDSA for bytes32;
    
    bytes32 public hashedDeployerId;
    address public admin;
    address[] public userAddresses;
    
    mapping(bytes32 => User) public encryptedIdToUser;
    mapping(address => User) public users;
    mapping(address => mapping(userRole => bool)) public userRoles;
    mapping(address => bool) public authorizedContracts;

    event UserRegistered(address indexed walletAddress, userRole role, address authorizedBy);
    event RoleDefined(address indexed walletAddress, userRole role, uint timestamp);
    event RoleUpdated(address indexed walletAddress, userRole role, address updatedBy, uint timestamp);

    constructor() {
        admin = msg.sender;
        hashedDeployerId = keccak256(abi.encodePacked(msg.sender, block.timestamp));

        // Register the deployer as admin
        users[msg.sender] = User({
            encryptedId: hashedDeployerId,
            createdAt: block.timestamp,
            isActive: true,
            walletAddress: msg.sender,
            authorizedBy: msg.sender,
            isWalletRegistered: true
        });

        userRoles[msg.sender][userRole.Admin] = true;

        encryptedIdToUser[hashedDeployerId] = users[msg.sender];
        userAddresses.push(msg.sender);
    }

    function registerUserFromSystem(
        address sender,
        address walletAddress,
        bytes32 encryptedId,
        userRole role
    ) external {
        require(users[walletAddress].walletAddress == address(0), "User already registered");
        require(encryptedId != bytes32(0), "Encrypted ID required");
        //admin can only register other roles except patient
        //patients can only register themselves
        if(role == userRole.Patient){
            require(sender == walletAddress, "Patients can only register themselves");
            users[walletAddress] = User({
                createdAt: block.timestamp,
                encryptedId: encryptedId,
                isActive: true,
                walletAddress: walletAddress,
                authorizedBy: walletAddress,
                isWalletRegistered: true
            });

            userRoles[walletAddress][userRole.Patient] = true;
        }
        // else{
        //     require(users[sender].role == userRole.Admin, "Only admin can register users");
        //     users[walletAddress] = User({
        //         role: role,
        //         createdAt: block.timestamp,
        //         encryptedId: encryptedId,
        //         isActive: true,
        //         walletAddress: walletAddress,
        //         authorizedBy: sender,
        //         isWalletRegistered: true
        //     });
        // }

        encryptedIdToUser[encryptedId] = users[walletAddress];  //map the user data to the encrypted ID

        userAddresses.push(walletAddress);
        emit UserRegistered(walletAddress, role, role == userRole.Patient? walletAddress: sender);
    }

    function getUserRole(address user) external view returns (userRole) {
        if(!users[user].isWalletRegistered) {
            return userRole.Unregistered;
        }
        if (userRoles[user][userRole.HealthcareProvider]) {
            return userRole.HealthcareProvider;
        } else if (userRoles[user][userRole.Insurer]) {
            return userRole.Insurer;
        } else if (userRoles[user][userRole.Admin]) {
            return userRole.Admin;
        }else {
            return userRole.Patient;
        }
    }

    function userExists(address user) external view returns (bool) {
        return users[user].walletAddress != address(0);
    }

    function getUserId(address user) external view returns (bytes32) {
        return users[user].encryptedId;
    }

    function getAllUsers() public view returns (User[] memory){
        User[] memory allUsers = new User[](userAddresses.length);
        for(uint i = 0; i < userAddresses.length; i++){
            allUsers[i] = users[userAddresses[i]];
        }

        return allUsers;
    }

    function getAllPatientAddresses() external view returns (address[] memory) {
        uint count = 0;
        for (uint i = 0; i < userAddresses.length; i++) {
            if (userRoles[userAddresses[i]][userRole.Patient]) {
                count++;
            }
        }

        address[] memory patients = new address[](count);
        uint index = 0;
        for (uint i = 0; i < userAddresses.length; i++) {
            if (userRoles[userAddresses[i]][userRole.Patient]) {
                patients[index] = userAddresses[i];
                index++;
            }
        }
        return patients;
    }

    function setUserRole(address user, userRole newRole) external {
        require(userRoles[msg.sender][userRole.Admin] == true || authorizedContracts[msg.sender], "Only admins are allowed to set additional roles");
        require(users[user].walletAddress != address(0), "User not registered");
        

        userRoles[user][newRole] = true;
    }

    function authorizeContract(address _contract) external {
        require(userRoles[msg.sender][userRole.Admin] == true, "Only admin can authorize contracts");
        authorizedContracts[_contract] = true;
    }
}