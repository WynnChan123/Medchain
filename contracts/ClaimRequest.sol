// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./Med2Chain.sol";

contract ClaimRequest is Med2ChainStructs {
    address public userManagementContract;
    address public medicalRecordsContract;
    address public accessControlContract;

    struct Claim {
        uint claimId;
        address patientAddress;
        address insurerAddress;
        string medicalRecordID;
        uint256 requestedAmount;
        uint256 approvedAmount;
        string claimType;
        string description;
        ClaimStatus status;
        string notes;
        uint256 submittedTimestamp;
        uint256 processedTimestamp;
        string cid; 
    }

    struct InsurerStats {
        uint totalClaims;
        uint pendingClaims;
        uint approvedClaims;
        uint rejectedClaims;
        uint256 totalRequestedAmount;
        uint256 totalApprovedAmount;
    }

    enum ClaimStatus {
        Pending,
        Approved,
        Rejected
    }

    mapping(uint => Claim) public claims;
    mapping(address => uint[]) private patientClaims;
    mapping(address => uint[]) private insurerClaims;
    mapping(string => uint[]) private recordClaims;
    uint public nextClaimId;

    event ClaimSubmitted(uint indexed claimId, address indexed patientAddress, address indexed insurerAddress, string recordId, uint256 amount, uint256 timestamp);
    event ClaimProcessed(uint indexed claimId, ClaimStatus status, uint256 approvedAmount, uint256 timestamp);

    constructor(address _userManagementContract, address _medicalRecordsContract, address _accessControlContract) {
        userManagementContract = _userManagementContract;
        medicalRecordsContract = _medicalRecordsContract;
        accessControlContract = _accessControlContract;
        nextClaimId = 1;
    }

    modifier onlyAuthorizedInsurer(uint _claimId) {
        require(claims[_claimId].insurerAddress == msg.sender, "Only authorized insurer can access this claim");
        _;
    }

    modifier onlyPatient() {
        require(IUserManagement(userManagementContract).getUserRole(msg.sender) == userRole.Patient, "Only patients can submit claims");
        _;
    }

    // 1. Submit Claim
    function submitClaim(
        address insurerAddress,
        string memory medicalRecordID,
        uint256 requestedAmount,
        string memory claimType,
        string memory description,
        string memory cid
    ) external onlyPatient {
        require(IMedicalRecords(medicalRecordsContract).recordExists(msg.sender, medicalRecordID), "Medical record does not exist");
        require(IAccessControl(accessControlContract).accessControl(msg.sender, insurerAddress, medicalRecordID), "Insurer does not have access to this medical record");

        claims[nextClaimId] = Claim({
            claimId: nextClaimId,
            patientAddress: msg.sender,
            insurerAddress: insurerAddress,
            medicalRecordID: medicalRecordID,
            requestedAmount: requestedAmount,
            approvedAmount: 0,
            claimType: claimType,
            description: description,
            status: ClaimStatus.Pending,
            notes: "",
            submittedTimestamp: block.timestamp,
            processedTimestamp: 0,
            cid: cid
        });

        patientClaims[msg.sender].push(nextClaimId);
        insurerClaims[insurerAddress].push(nextClaimId);
        recordClaims[medicalRecordID].push(nextClaimId);

        emit ClaimSubmitted(nextClaimId, msg.sender, insurerAddress, medicalRecordID, requestedAmount, block.timestamp);
        nextClaimId++;
    }

    // 2. Approve Claim with Amount and Notes
    function approveClaim(
        uint claimId, 
        uint256 approvedAmount,
        string memory notes
    ) external onlyAuthorizedInsurer(claimId) {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Pending, "Claim has already been processed");
        require(approvedAmount > 0, "Approved amount must be greater than 0");
        require(approvedAmount <= claim.requestedAmount, "Approved amount cannot exceed requested amount");

        claim.status = ClaimStatus.Approved;
        claim.approvedAmount = approvedAmount;
        claim.notes = notes;
        claim.processedTimestamp = block.timestamp;

        emit ClaimProcessed(claimId, ClaimStatus.Approved, approvedAmount, block.timestamp);
    }

    // 3. Reject Claim with Reason
    function rejectClaim(
        uint claimId,
        string memory rejectionReason
    ) external onlyAuthorizedInsurer(claimId) {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.Pending, "Claim has already been processed");
        require(bytes(rejectionReason).length > 0, "Rejection reason is required");

        claim.status = ClaimStatus.Rejected;
        claim.notes = rejectionReason;
        claim.processedTimestamp = block.timestamp;

        emit ClaimProcessed(claimId, ClaimStatus.Rejected, 0, block.timestamp);
    }

    // 4. Get Claim Details
    function getClaim(uint claimId) external view returns (Claim memory) {
        return claims[claimId];
    }

    // 5. Get Claims by Patient
    function getClaimsByPatient(address patientAddress) external view returns (uint[] memory) {
        return patientClaims[patientAddress];
    }

    // 6. Get Claims by Insurer
    function getClaimsByInsurer(address insurerAddress) external view returns (uint[] memory) {
        return insurerClaims[insurerAddress];
    }

    function getClaimsByMedicalRecord(address patientAddress, string memory medicalRecordID) external view returns (uint[] memory) {
        require(
            msg.sender == patientAddress || 
            IAccessControl(accessControlContract).accessControl(patientAddress, msg.sender, medicalRecordID),
            "No access to view claims for this record"
        );
        return recordClaims[medicalRecordID];
    }

    // 7. Get Insurer Statistics
    function getInsurerStatistics(address insurerAddress) external view returns (InsurerStats memory stats) {
        uint[] memory claimIds = insurerClaims[insurerAddress];
        
        for (uint i = 0; i < claimIds.length; i++) {
            Claim storage claim = claims[claimIds[i]]; // Use storage instead of memory
            stats.totalClaims++;
            stats.totalRequestedAmount += claim.requestedAmount;
            
            if (claim.status == ClaimStatus.Pending) {
                stats.pendingClaims++;
            } else if (claim.status == ClaimStatus.Approved) {
                stats.approvedClaims++;
                stats.totalApprovedAmount += claim.approvedAmount;
            } else if (claim.status == ClaimStatus.Rejected) {
                stats.rejectedClaims++;
            }
        }
        
        return stats;
    }

    // 8. Get FULL Medical Record Data for a claim (not just the ID)
    function getClaimMedicalRecord(uint claimId) external view onlyAuthorizedInsurer(claimId) returns (MedicalRecord memory) {
        Claim memory claim = claims[claimId];
        
        // Call the MedicalRecords contract to get the full record
        return IMedicalRecords(medicalRecordsContract).getMedicalRecord(claim.patientAddress, claim.medicalRecordID);
    }

    // NEW: Get full details for multiple claims (useful for dashboard)
    function getClaimDetails(uint[] memory claimIds) external view returns (Claim[] memory) {
        Claim[] memory claimDetails = new Claim[](claimIds.length);
        
        for (uint i = 0; i < claimIds.length; i++) {
            claimDetails[i] = claims[claimIds[i]];
        }
        
        return claimDetails;
    }
}