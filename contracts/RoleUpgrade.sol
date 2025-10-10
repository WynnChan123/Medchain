//RoleUpgrade.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./Med2Chain.sol";

contract RoleUpgrade is Med2ChainStructs {
    address public admin;
    uint public requestId;

    address public userManagementContract;
    address public medicalRecordsContract;

    
    struct RoleUpgradeRequest {
        uint requestId;
        userRole newRole;
        bool isProcessed;
        bool isApproved;
        address[] adminAddresses;
        address requester;
        uint256 timestamp;
        string cid;
    }

    // Map request ID to the full request struct
    mapping(uint => RoleUpgradeRequest) public requests;
    
    // Map user address to their request IDs (one user can have multiple requests)
    mapping(address => uint[]) public userToRequests;
    
    // Map request ID to admin who approved it
    mapping(uint => address) public requestToApprover;

    // Map request id to recipient address to encrypted AES key bytes
    mapping(uint => mapping(address => bytes)) public encryptedKeys;


    event RoleUpgradeRequested(uint requestId, userRole newRole, address indexed requester, address[] admins, uint256 timestamp);
    event RoleUpgradeApproved(uint requestId, address indexed userToUpgrade, address indexed approver, uint256 timestamp);
    event RoleUpgradeRejected(uint requestId, address indexed userToUpgrade, address indexed rejector, uint256 timestamp);

    modifier onlyAuthorizedAdmin(uint _requestId) {
        bool isAuthorized = false;
        for (uint i = 0; i < requests[_requestId].adminAddresses.length; i++) {
            if (requests[_requestId].adminAddresses[i] == msg.sender) {
                isAuthorized = true;
                break;
            }
        }
        require(isAuthorized, "Only authorized admin can perform this action");
        _;
    }


    constructor(address _userManagementContract, address _medicalRecordsContract) {
        admin = msg.sender;
        requestId = 0;
        userManagementContract = _userManagementContract;
        medicalRecordsContract = _medicalRecordsContract;
    }

    function submitUpgradeRequest(address patient, string calldata cid, userRole newRole, address[] calldata admins, bytes[] calldata encryptedKey) external {
        require(IUserManagement(userManagementContract).users(patient).walletAddress != address(0), "User not registered");
        require(IUserManagement(userManagementContract).users(patient).isActive, "User is not active");
        require(IUserManagement(userManagementContract).getUserRole(patient) != userRole.Admin, "Admin cannot request role upgrade");
        require(admins.length == encryptedKey.length, "Admins and encrypted keys length mismatch");
        require(bytes(cid).length > 0, "CID cannot be empty");
        //require that only one request per user is active at a time
        for (uint i = 0; i < userToRequests[patient].length; i++) {
            uint existingRequestId = userToRequests[patient][i];
            if (!requests[existingRequestId].isProcessed) {
                revert("You have an active request pending");
            }
        }

        requestId++;
        requests[requestId] = RoleUpgradeRequest({
            requestId: requestId,
            newRole: newRole,
            isProcessed: false,
            isApproved: false,
            adminAddresses: admins,
            requester: patient,
            timestamp: block.timestamp,
            cid: cid
        });

        for (uint i = 0; i < admins.length; i++) {
            encryptedKeys[requestId][admins[i]] = encryptedKey[i];
        }

        userToRequests[patient].push(requestId);
        emit RoleUpgradeRequested(requestId, newRole, patient, admins, block.timestamp);
    }

    function approveRequest(uint _requestId, address userToUpgrade) external onlyAuthorizedAdmin(_requestId) {
        RoleUpgradeRequest storage request = requests[_requestId];
        require(request.requestId > 0 , "Request does not exist");

        IUserManagement(userManagementContract).setUserRole(userToUpgrade, request.newRole);

        requests[_requestId].isApproved = true;
        requests[_requestId].isProcessed = true;
        requestToApprover[_requestId] = msg.sender;

        emit RoleUpgradeApproved(_requestId, userToUpgrade, msg.sender, block.timestamp);
    }

    function rejectRequest(uint _requestId) external onlyAuthorizedAdmin(_requestId) {
        RoleUpgradeRequest storage request = requests[_requestId];
        require(request.requestId > 0 , "Request does not exist");

        requests[_requestId].isApproved = false;
        requests[_requestId].isProcessed = true;
        requestToApprover[_requestId] = msg.sender;

        emit RoleUpgradeRejected(_requestId, request.requester, msg.sender, block.timestamp);
    }

    // Read encrypted key for current caller (so caller can fetch it)
    function getEncryptedKeyForCaller(uint _requestId) external view returns (bytes memory) {
        return encryptedKeys[_requestId][msg.sender];
    }

}

