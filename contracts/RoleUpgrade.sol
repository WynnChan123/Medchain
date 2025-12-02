//RoleUpgrade.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./Med2Chain.sol";

contract RoleUpgrade is Med2ChainStructs {
    address public admin;
    uint public requestId;
    address[] private adminList;
    address[] private insurerList;
    address[] private providerList;

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

    struct InsurerProfile {
        string companyName;
        bool isRegistered;
        uint256 registrationTimestamp;
    }

    struct ProviderProfile {
        string doctorName;
        bool isRegistered;
        uint256 registrationTimestamp;
    }

    // Map request ID to the full request struct
    mapping(uint => RoleUpgradeRequest) public requests;
    
    // Map user address to their request IDs (one user can have multiple requests)
    mapping(address => uint[]) public userToRequests;
    
    // Map request ID to admin who approved it
    mapping(uint => address) public requestToApprover;

    // Map request id to recipient address to encrypted AES key bytes
    mapping(uint => mapping(address => bytes)) public encryptedKeys;

    // Store admin public keys (RSA, base64 encoded)
    mapping(address => string) public adminPublicKeys;

    // Map admins to the user pending requests
    mapping(address => uint[]) public adminToRequests;

    //Map insurer to insurer profile
    mapping(address => InsurerProfile) public insurerProfiles;

    //Map provider to provider profile
    mapping(address => ProviderProfile) public providerProfiles;

    //Map company name to bool to check uniqueness
    mapping(string => bool) public registeredCompanyNames;


    event RoleUpgradeRequested(uint requestId, userRole newRole, address indexed requester, address[] admins, uint256 timestamp);
    event RoleUpgradeApproved(uint requestId, address indexed userToUpgrade, address indexed approver, uint256 timestamp);
    event RoleUpgradeRejected(uint requestId, address indexed userToUpgrade, address indexed rejector, uint256 timestamp);

    modifier onlyAuthorizedAdmin(uint _requestId) {
        // Check if caller is in the specific request's admin list
        bool isAuthorized = false;
        for (uint i = 0; i < requests[_requestId].adminAddresses.length; i++) {
            if (requests[_requestId].adminAddresses[i] == msg.sender) {
                isAuthorized = true;
                break;
            }
        }
        
        // If not in request-specific list, check if caller is a general admin
        if (!isAuthorized) {
            for (uint i = 0; i < adminList.length; i++) {
                if (adminList[i] == msg.sender) {
                    isAuthorized = true;
                    break;
                }
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
        adminList.push(msg.sender);
    }

    function submitUpgradeRequest(
        address patient, 
        string calldata cid, 
        userRole newRole, 
        address[] calldata admins, 
        bytes[] calldata encryptedKey,
        string calldata companyName,
        string calldata doctorName
    ) external {
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

        if(newRole == userRole.Insurer){
            require(bytes(companyName).length > 0, "Company name cannot be empty for insurer role");
            require(!registeredCompanyNames[companyName], "Company name already registered");
        }

        if(newRole == userRole.HealthcareProvider){
            require(bytes(doctorName).length > 0, "Doctor name cannot be empty for healthcare provider role");
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
            adminToRequests[admins[i]].push(requestId);
        }

        userToRequests[patient].push(requestId);
        emit RoleUpgradeRequested(requestId, newRole, patient, admins, block.timestamp);
    }

    function getRequestAdminAddresses(uint _requestId) external view returns (address[] memory) {
        return requests[_requestId].adminAddresses;
    }

    function approveRequest(
        uint _requestId, 
        address userToUpgrade, 
        string calldata roleName
    ) external onlyAuthorizedAdmin(_requestId) {
        RoleUpgradeRequest storage request = requests[_requestId];
        require(request.requestId > 0 , "Request does not exist");

        IUserManagement(userManagementContract).setUserRole(userToUpgrade, request.newRole);

        if(request.newRole == userRole.Admin){
            adminList.push(userToUpgrade);
        }else if(request.newRole == userRole.Insurer){
            require(bytes(roleName).length > 0, "Company name required for insurer");
            registeredCompanyNames[roleName] = true;
            insurerProfiles[userToUpgrade] = InsurerProfile({
                companyName: roleName,
                isRegistered: true,
                registrationTimestamp: block.timestamp
            });
            insurerList.push(userToUpgrade);
        }else if(request.newRole == userRole.HealthcareProvider){
            require(bytes(roleName).length > 0, "Doctor name required for provider");
            providerProfiles[userToUpgrade] = ProviderProfile({
                doctorName: roleName,
                isRegistered: true,
                registrationTimestamp: block.timestamp
            });
            providerList.push(userToUpgrade);
        }

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
    function getEncryptedKeyForCaller(uint _requestId) external view onlyAuthorizedAdmin(_requestId) returns (bytes memory) {
        return encryptedKeys[_requestId][msg.sender];
    }

    // Read encrypted key for any admin (fallback function)
    function getEncryptedKeyForAdmin(uint _requestId, address _admin) external view returns (bytes memory) {
        // Check if caller is a general admin
        bool isAdmin = false;
        for (uint i = 0; i < adminList.length; i++) {
            if (adminList[i] == msg.sender) {
                isAdmin = true;
                break;
            }
        }
        require(isAdmin, "Only admin can perform this action");
        
        return encryptedKeys[_requestId][_admin];
    }

    function getAdmins() external view returns (address[] memory){        
        return adminList;
    }

    function getAllInsurers() external view returns (address[] memory addresses, string[] memory names) {
        uint256 count = insurerList.length;
        addresses = new address[](count);
        names = new string[](count);
        
        for(uint i = 0; i < count; i++) {
            addresses[i] = insurerList[i];
            names[i] = insurerProfiles[insurerList[i]].companyName;
        }
        
        return (addresses, names);
    }

    function getAllProviders() external view returns (address[] memory addresses, string[] memory names) {
        uint256 count = providerList.length;
        addresses = new address[](count);
        names = new string[](count);
        
        for(uint i = 0; i < count; i++) {
            addresses[i] = providerList[i];
            names[i] = providerProfiles[providerList[i]].doctorName;
        }
        
        return (addresses, names);
    }

    function registerAdminPublicKey(string calldata _publicKey) external {
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        adminPublicKeys[msg.sender] = _publicKey;
    }

    function getAdminPublicKey(address _admin) external view returns (string memory){
        return adminPublicKeys[_admin];
    }

    function getPendingRequestByUser(address patient) external view returns (RoleUpgradeRequest[] memory){
        //count pending requests
        uint[] memory requestIds = userToRequests[patient];
        uint pendingCount = 0;

        for(uint i=0; i< requestIds.length; i++){
            if(!requests[requestIds[i]].isProcessed){
                pendingCount++;
            }
        }

        //create an array of pending requests
        RoleUpgradeRequest[] memory pendingRequests = new RoleUpgradeRequest[](pendingCount);
        uint currentIndex = 0;

        for (uint i = 0; i < requestIds.length; i++) {
            if (!requests[requestIds[i]].isProcessed) {
                pendingRequests[currentIndex] = requests[requestIds[i]];
                currentIndex++;
            }
        }

        return pendingRequests;
    }

    //getPendingRequestsByAdmin (display pending requests)
    function getPendingRequestsByAdmin(address adminAddress) external view returns (RoleUpgradeRequest[] memory){
        uint[] memory requestIds = adminToRequests[adminAddress];
        uint pendingReview = 0;

        for(uint i=0; i<requestIds.length; i++){
            if(!requests[requestIds[i]].isProcessed){
                pendingReview++;
            }
        }

        // Create array of pending requests
        RoleUpgradeRequest[] memory pendingRequests = new RoleUpgradeRequest[](pendingReview);
        uint currentIndex = 0;

        for (uint i = 0; i < requestIds.length; i++) {
            if (!requests[requestIds[i]].isProcessed) {
                pendingRequests[currentIndex] = requests[requestIds[i]];
                currentIndex++;
            }
        }

        return pendingRequests;
    }

    function getAcknowledgedRequestsByAdmin(address adminAddress) external view returns (RoleUpgradeRequest[] memory){
        uint[] memory requestIds = adminToRequests[adminAddress];
        uint reviewedRequest = 0;

        for(uint i=0; i<requestIds.length; i++){
            if(requests[requestIds[i]].isProcessed){
                reviewedRequest++;
            }
        }

        // Create array of pending requests
        RoleUpgradeRequest[] memory acknowledgedRequests = new RoleUpgradeRequest[](reviewedRequest);
        uint currentIndex = 0;

        for (uint i = 0; i < requestIds.length; i++) {
            if (requests[requestIds[i]].isProcessed) {
                acknowledgedRequests[currentIndex] = requests[requestIds[i]];
                currentIndex++;
            }
        }

        return acknowledgedRequests;
    }
}

