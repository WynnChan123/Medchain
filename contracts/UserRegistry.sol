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

    event UserRegistered(address indexed walletAddress, userRole role, address authorizedBy);
    event RoleDefined(address indexed walletAddress, userRole role, uint timestamp);
    event RoleUpdated(address indexed walletAddress, userRole role, address updatedBy, uint timestamp);

    constructor() {
        admin = msg.sender;
        hashedDeployerId = keccak256(abi.encodePacked(msg.sender, block.timestamp));

        // Register the deployer as admin
        users[msg.sender] = User({
            role: userRole.Admin,
            encryptedId: hashedDeployerId,
            createdAt: block.timestamp,
            isActive: true,
            walletAddress: msg.sender,
            authorizedBy: msg.sender,
            isWalletRegistered: true
        });

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
                role: userRole.Patient,
                createdAt: block.timestamp,
                encryptedId: encryptedId,
                isActive: true,
                walletAddress: walletAddress,
                authorizedBy: walletAddress,
                isWalletRegistered: true
            });

        }else{
            require(users[sender].role == userRole.Admin, "Only admin can register users");
            users[walletAddress] = User({
                role: role,
                createdAt: block.timestamp,
                encryptedId: encryptedId,
                isActive: true,
                walletAddress: walletAddress,
                authorizedBy: sender,
                isWalletRegistered: true
            });
        }

        encryptedIdToUser[encryptedId] = users[walletAddress];  //map the user data to the encrypted ID

        userAddresses.push(walletAddress);
        emit UserRegistered(walletAddress, role, role == userRole.Patient? walletAddress: sender);
    }

    function getUserRole(address user) external view returns (userRole) {
        if(!users[user].isWalletRegistered) {
            return userRole.Unregistered;
        }
        return users[user].role;
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

    function assignRoles(address user, userRole role)  external {
        require(users[msg.sender].role == userRole.Admin, "Only admins are allowed to define roles");
        require(users[user].walletAddress != address(0), "User not registered");

        users[user].role = role;

        emit RoleDefined(user, role, block.timestamp);
    }

    function updateRoles(address user, userRole newRole) external {
        require(users[msg.sender].role == userRole.Admin, "Only admins are allowed to update roles");
        require(users[user].walletAddress != address(0), "User not registered");

        users[user].role = newRole;

        emit RoleUpdated(user, newRole, msg.sender, block.timestamp);
    }
}