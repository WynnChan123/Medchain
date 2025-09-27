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

    function getUserRole(address user) external view returns (userRole) {
        return users[user].role;
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

        userRole oldRole = users[user].role;
        users[user].role = newRole;

        emit RoleUpdated(user, newRole, msg.sender, block.timestamp);
    }
}