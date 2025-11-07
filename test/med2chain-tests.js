const { expect } = require('chai');
const { ethers } = require('hardhat');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

describe('Healthcare System Contracts', function () {
  let userManagement;
  let medicalRecords;
  let accessControl;
  let healthcareSystem;
  let roleUpgrade;
  let admin, patient, doctor, insurer;

  const adminHashedId =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const patientHashedId =
    '0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1';
  const doctorHashedId =
    '0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12';
  const insurerHashedId =
    '0x456789013def1234567890123def1234567890123def1234567890123def123';

  beforeEach(async function () {
    [admin, patient, doctor, insurer] = await ethers.getSigners();

    // Deploy UserManagement first
    const UserManagement = await ethers.getContractFactory('UserManagement');
    userManagement = await UserManagement.deploy();
    await userManagement.waitForDeployment();

    // Deploy MedicalRecordsManagement
    const MedicalRecordsManagement = await ethers.getContractFactory(
      'MedicalRecordsManagement'
    );
    medicalRecords = await MedicalRecordsManagement.deploy(
      await userManagement.getAddress()
    );
    await medicalRecords.waitForDeployment();

    // Deploy AccessControlManagement
    const AccessControlManagement = await ethers.getContractFactory(
      'AccessControlManagement'
    );
    accessControl = await AccessControlManagement.deploy(
      await userManagement.getAddress(),
      await medicalRecords.getAddress()
    );
    await accessControl.waitForDeployment();

    const RoleUpgrade = await ethers.getContractFactory('RoleUpgrade');
    roleUpgrade = await RoleUpgrade.deploy(
      await userManagement.getAddress(),
      await medicalRecords.getAddress()
    );
    await roleUpgrade.waitForDeployment();

    // Deploy HealthcareSystem
    const HealthcareSystem = await ethers.getContractFactory(
      'HealthcareSystem'
    );
    healthcareSystem = await HealthcareSystem.deploy(
      await userManagement.getAddress(),
      await medicalRecords.getAddress(),
      await accessControl.getAddress(),
      await roleUpgrade.getAddress()
    );
    await healthcareSystem.waitForDeployment();

    // Authorize RoleUpgrade contract to set user roles
    await userManagement
      .connect(admin)
      .authorizeContract(await roleUpgrade.getAddress());
  });

  describe('UserManagement', function () {
    it('Should set admin correctly on deployment', async function () {
      expect(await userManagement.admin()).to.equal(await admin.getAddress());
      const adminUser = await userManagement.users(await admin.getAddress());
      const isAdmin = await userManagement.userRoles(
        await admin.getAddress(),
        4
      );
      expect(isAdmin).to.equal(true);
      expect(adminUser.isActive).to.be.true;
    });

    it('Should allow patient self-registration', async function () {
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      const patientUser = await userManagement.users(
        await patient.getAddress()
      );
      const isPatient = await userManagement.userRoles(
        await patient.getAddress(),
        1
      );
      expect(isPatient).to.equal(true);
      expect(patientUser.isActive).to.be.true;
      expect(patientUser.authorizedBy).to.equal(await patient.getAddress());
    });

    it('Should prevent duplicate registrations', async function () {
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await expect(
        healthcareSystem
          .connect(patient)
          .registerUser(await patient.getAddress(), patientHashedId, 1)
      ).to.be.revertedWith('User already registered');
    });

    it('Should correctly identify existing users', async function () {
      expect(await userManagement.userExists(await admin.getAddress())).to.be
        .true;

      expect(await userManagement.userExists(await patient.getAddress())).to.be
        .false;

      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      expect(await userManagement.userExists(await patient.getAddress())).to.be
        .true;
    });

    it('Should return false for zero address', async function () {
      expect(
        await userManagement.userExists(
          '0x0000000000000000000000000000000000000000'
        )
      ).to.be.false;
    });

    it('Should work correctly with getUserRole for non-existent users', async function () {
      const nonExistentUser = await doctor.getAddress();

      expect(await userManagement.userExists(nonExistentUser)).to.be.false;
      expect(await userManagement.getUserRole(nonExistentUser)).to.equal(0);

      // Register as patient first
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      // Submit role upgrade request from patient to become doctor
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

      await roleUpgrade.connect(patient).submitUpgradeRequest(
        await patient.getAddress(),
        'QmTestCID',
        2, // HealthcareProvider role
        admins,
        encryptedKey
      );

      // Admin approves the request
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress());

      expect(await userManagement.userExists(await patient.getAddress())).to.be
        .true;
      expect(
        await userManagement.getUserRole(await patient.getAddress())
      ).to.equal(2);
    });
  });

  describe('MedicalRecordsManagement', function () {
    beforeEach(async function () {
      // Register patient first
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      // Register doctor as patient first, then upgrade to HealthcareProvider
      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Upgrade doctor to HealthcareProvider role
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress());
    });

    it('Should allow doctors to add medical records', async function () {
      const recordId = 'LAB_001';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmEncryptedCidV1',
          patientKey
        );

      const record = await medicalRecords.patientMedicalRecord(
        await patient.getAddress(),
        recordId
      );
      expect(record.medicalRecordID).to.equal(recordId);
      expect(record.patientAddress).to.equal(await patient.getAddress());
      expect(record.cid).to.equal('QmEncryptedCidV1');
      const storedKey = await medicalRecords.encryptedKeys(
        recordId,
        await patient.getAddress()
      );
      expect(storedKey).to.equal(ethers.hexlify(patientKey));
    });

    it('Should prevent non-doctors from adding medical records', async function () {
      const recordId = 'LAB_001';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');

      await expect(
        medicalRecords
          .connect(patient)
          .addMedicalRecord(
            await patient.getAddress(),
            recordId,
            'QmHash123',
            patientKey
          )
      ).to.be.revertedWith('Only doctors can add records');
    });

    it('Should prevent duplicate record IDs', async function () {
      const recordId = 'LAB_001';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey
        );

      await expect(
        medicalRecords
          .connect(doctor)
          .addMedicalRecord(
            await patient.getAddress(),
            recordId,
            'QmHash124',
            patientKey
          )
      ).to.be.revertedWith('Record already exists');
    });

    it('Should generate consistent record hash', async function () {
      const recordId = 'LAB_001';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey
        );

      const hash1 = await medicalRecords.getRecordHash(
        await patient.getAddress(),
        recordId
      );
      const hash2 = await medicalRecords.getRecordHash(
        await patient.getAddress(),
        recordId
      );

      expect(hash1).to.equal(hash2);
      expect(hash1).to.not.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      );
    });
  });

  describe('MedicalRecordsManagement - Patient Record Tracking IDs', function () {
    beforeEach(async function (){
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        )

        await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress());
    })
    
    it('Should return no record IDs for patient with no records', async function () {
      const recordIDs = await medicalRecords.getPatientRecordIDs(await patient.getAddress());
      expect(recordIDs.length).to.equal(0);
    })

    it('Should return a single record ID when record is added', async function () {
      const recordId = 'LAB_001';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId, 
          'QmHash123',
          patientKey
        )

      const recordIDs = await medicalRecords.getPatientRecordIDs(await patient.getAddress());
      expect(recordIDs.length).to.equal(1);
      expect(recordIDs[0]).to.equal(recordId);
    })


    it('Should return multiple record IDs when multiple records are added', async function () {
      const recordId1 = 'LAB_001';
      const recordId2 = 'LAB_002';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId1,
          'QmHash123',
          patientKey
        )
      
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId2,
          'QmHash124',
          patientKey
        )

      const recordIDs = await medicalRecords.getPatientRecordIDs(await patient.getAddress());
      expect(recordIDs.length).to.equal(2);
      expect(recordIDs).to.include(recordId1);
      expect(recordIDs).to.include(recordId2);
    });

    it('Should return record IDs specific to each patient', async function () {
      // Register patient 2
      const signers = await ethers.getSigners();
      const patient2 = signers[4];

      await healthcareSystem
        .connect(patient2)
        .registerUser(await patient2.getAddress(), ethers.keccak256(ethers.toUtf8Bytes('patient2')), 1);

      const recordId1 = 'LAB_001';
      const recordId2 = 'LAB_002';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId1,
          'QmHash123',
          patientKey
        )
      
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
        await patient2.getAddress(),
        recordId2,
        'QmHash124',
        patientKey
        )

      const recordIDforPatient1 = await medicalRecords.getPatientRecordIDs(await patient.getAddress());
      expect(recordIDforPatient1.length).to.equal(1);
      expect(recordIDforPatient1[0]).to.equal(recordId1);
      const recordIDforPatient2 = await medicalRecords.getPatientRecordIDs(await patient2.getAddress());
      expect(recordIDforPatient2.length).to.equal(1);
      expect(recordIDforPatient2[0]).to.equal(recordId2);
    })

    it('Should return the correct record count after adding multiple records', async function(){
      const recordId1 = 'LAB_001';
      const recordId2 = 'LAB_002';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId1, 
          'QmHash123',
          patientKey
        )

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId2, 
          'QmHash124',
          patientKey
        )
      
      const recordCount = await medicalRecords.recordCount(await patient.getAddress());
      expect(recordCount).to.equal(2);
      const recordIDcount = await medicalRecords.getPatientRecordIDs(await patient.getAddress());
      expect(recordIDcount.length).to.equal(2);
    })

    it('Should preserve order of record IDs as they are added', async function () {
      const recordIds = ['LAB_001', 'XRAY_001', 'MRI_001', 'BLOOD_001'];
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');

      for (let i = 0; i < recordIds.length; i++) {
        await medicalRecords
          .connect(doctor)
          .addMedicalRecord(
            await patient.getAddress(),
            recordIds[i],
            `QmCid${i}`,
            patientKey
          );
      }

      const retrievedRecordIDs = await medicalRecords.getPatientRecordIDs(
        await patient.getAddress()
      );

      expect(retrievedRecordIDs.length).to.equal(recordIds.length);
      for (let i = 0; i < recordIds.length; i++) {
        expect(retrievedRecordIDs[i]).to.equal(recordIds[i]);
      }
    });
  });


  describe('AccessControlManagement', function () {
    const recordId = 'LAB_001';

    beforeEach(async function () {
      // Register users
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Upgrade doctor to HealthcareProvider
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress());

      // Add medical record
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey
        );
    });

    it('Should allow patients to grant access', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      const hasAccess = await accessControl.accessControl(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );
      expect(hasAccess).to.be.true;
    });

    it('Should prevent non-patients from granting access', async function () {
      await expect(
        accessControl
          .connect(doctor)
          .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId)
      ).to.be.revertedWith(
        'Only patients are allowed to grant access to third parties'
      );
    });

    it('Should prevent granting access to non-existent records', async function () {
      await expect(
        accessControl
          .connect(patient)
          .grantAccess(await patient.getAddress(), await doctor.getAddress(), 'NON_EXISTENT')
      ).to.be.revertedWith('Patient record does not exist');
    });

    it('Should allow patients to revoke access', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      await accessControl
        .connect(patient)
        .revokeAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      const hasAccess = await accessControl.accessControl(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );
      expect(hasAccess).to.be.false;
    });

    it('Should track who has access', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      const grantedPeople = await accessControl
        .connect(patient)
        .checkWhoHasAccess(recordId);
      expect(grantedPeople).to.include(await doctor.getAddress());
    });

    it('Should prevent duplicate access grants', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      await expect(
        accessControl
          .connect(patient)
          .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId)
      ).to.be.revertedWith('Access already granted');
    });

    it('Should prevent patients from granting access to other patients records', async function () {
      // Register another patient - use a new signer
      const signers = await ethers.getSigners();
      const patient2 = signers[4]; // Use the 5th signer (index 4) to avoid conflicts
      await healthcareSystem
        .connect(patient2)
        .registerUser(await patient2.getAddress(), ethers.keccak256(ethers.toUtf8Bytes('patient2')), 1);

      // Patient tries to grant access to another patient's record
      await expect(
        accessControl
          .connect(patient)
          .grantAccess(await patient2.getAddress(), await doctor.getAddress(), recordId)
      ).to.be.revertedWith('Patients can only grant access to their own records');
    });

    it('Should prevent patients from revoking access from other patients records', async function () {
      // Register another patient and create a record for them - use a new signer
      const signers = await ethers.getSigners();
      const patient2 = signers[4]; // Use the 5th signer (index 4) to avoid conflicts
      await healthcareSystem
        .connect(patient2)
        .registerUser(await patient2.getAddress(), ethers.keccak256(ethers.toUtf8Bytes('patient2')), 1);

      const recordId2 = 'LAB_002';
      const patient2Key = ethers.toUtf8Bytes('aes-key-for-patient2');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient2.getAddress(),
          recordId2,
          'QmHash124',
          patient2Key
        );

      // Patient2 grants access to doctor
      await accessControl
        .connect(patient2)
        .grantAccess(await patient2.getAddress(), await doctor.getAddress(), recordId2);

      // Patient tries to revoke access from patient2's record
      await expect(
        accessControl
          .connect(patient)
          .revokeAccess(await patient2.getAddress(), await doctor.getAddress(), recordId2)
      ).to.be.revertedWith('Patients can only revoke access from their own records');
    });

    it('Should allow shareMedicalRecord wrapper function to work correctly', async function () {
      const recipientKey = ethers.toUtf8Bytes('aes-key-for-doctor');
      await expect(
        medicalRecords
          .connect(patient)
          .shareMedicalRecord(
            await patient.getAddress(),
            recordId,
            await doctor.getAddress(),
            await accessControl.getAddress(),
            recipientKey
          )
      ).to.emit(medicalRecords, 'KeyStored');

      const hasAccess = await accessControl.accessControl(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );
      expect(hasAccess).to.be.true;
    });

    it('Should prevent shareMedicalRecord from being called by non-patients', async function () {
      const recipientKey = ethers.toUtf8Bytes('aes-key-for-doctor');
      await expect(
        medicalRecords
          .connect(doctor)
          .shareMedicalRecord(
            await patient.getAddress(),
            recordId,
            await doctor.getAddress(),
            await accessControl.getAddress(),
            recipientKey
          )
      ).to.be.revertedWith('Only patients can share records');
    });

    it('Should prevent shareMedicalRecord from sharing other patients records', async function () {
      // Register another patient - use a new signer
      const signers = await ethers.getSigners();
      const patient2 = signers[4]; // Use the 5th signer (index 4) to avoid conflicts
      await healthcareSystem
        .connect(patient2)
        .registerUser(await patient2.getAddress(), ethers.keccak256(ethers.toUtf8Bytes('patient2')), 1);

      const recordId2 = 'LAB_002';
      const patient2Key = ethers.toUtf8Bytes('aes-key-for-patient2');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient2.getAddress(),
          recordId2,
          'QmHash123',
          patient2Key
        );

      const recipientKey = ethers.toUtf8Bytes('aes-key-for-doctor');
      await expect(
        medicalRecords
          .connect(patient)
          .shareMedicalRecord(
            await patient2.getAddress(),
            recordId2,
            await doctor.getAddress(),
            await accessControl.getAddress(),
            recipientKey
          )
      ).to.be.revertedWith('Patients can only share their own records');
    });

    it('Should allow revoking access that was never granted (no operation)', async function () {
      // Try to revoke access that was never granted - should not revert
      await accessControl
        .connect(patient)
        .revokeAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      const hasAccess = await accessControl.accessControl(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );
      expect(hasAccess).to.be.false;
    });

    it('Should return empty array when checking access for non-existent record', async function () {
      const grantedPeople = await accessControl
        .connect(patient)
        .checkWhoHasAccess('NON_EXISTENT_RECORD');
      expect(grantedPeople.length).to.equal(0);
    });

    it('Should prevent non-patients from checking who has access', async function () {
      await expect(
        accessControl
          .connect(doctor)
          .checkWhoHasAccess(recordId)
      ).to.be.revertedWith('Only patients are allowed to check who has access of their documents');
    });
  });

  describe('RoleUpgrade', function () {
    const cid = 'Qm123abcCIDExample';
    const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

    beforeEach(async function () {
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);
    });

    it('Should allow patients to request role upgrade', async function () {
      const admins = [await admin.getAddress()];

      await expect(
        roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            2,
            admins,
            encryptedKey
          )
      )
        .to.emit(roleUpgrade, 'RoleUpgradeRequested')
        .withArgs(1, 2, await patient.getAddress(), admins, anyValue);
    });

    it('Should allow admin to approve upgrade requests', async function () {
      const admins = [await admin.getAddress()];

      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      await expect(
        roleUpgrade.connect(admin).approveRequest(1, await patient.getAddress())
      )
        .to.emit(roleUpgrade, 'RoleUpgradeApproved')
        .withArgs(
          1,
          await patient.getAddress(),
          await admin.getAddress(),
          anyValue
        );

      const request = await roleUpgrade.requests(1);
      expect(request.isProcessed).to.be.true;
      expect(request.isApproved).to.be.true;

      const role = await userManagement.getUserRole(await patient.getAddress());
      expect(role).to.equal(2);
    });

    it('Should allow admin to reject upgrade requests', async function () {
      const admins = [await admin.getAddress()];

      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      await expect(roleUpgrade.connect(admin).rejectRequest(1))
        .to.emit(roleUpgrade, 'RoleUpgradeRejected')
        .withArgs(
          1,
          await patient.getAddress(),
          await admin.getAddress(),
          anyValue
        );

      const request = await roleUpgrade.requests(1);
      expect(request.isProcessed).to.be.true;
      expect(request.isApproved).to.be.false;

      const role = await userManagement.getUserRole(await patient.getAddress());
      expect(role).to.equal(1);
    });

    it('Should prevent non-authorized admins from approving', async function () {
      const admins = [await admin.getAddress()];

      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      await expect(
        roleUpgrade
          .connect(doctor)
          .approveRequest(1, await patient.getAddress())
      ).to.be.revertedWith('Only authorized admin can perform this action');
    });

    it('Should prevent multiple active requests from same patient', async function () {
      const admins = [await admin.getAddress()];

      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      await expect(
        roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            3,
            admins,
            encryptedKey
          )
      ).to.be.revertedWith('You have an active request pending');
    });

    it('Should prevent admins from requesting role upgrade', async function () {
      const admins = [await admin.getAddress()];

      await expect(
        roleUpgrade
          .connect(admin)
          .submitUpgradeRequest(
            await admin.getAddress(),
            'Qm123abcCIDExample',
            2,
            admins,
            encryptedKey
          )
      ).to.be.revertedWith('Admin cannot request role upgrade');
    });

    it('Should return encrypted key for authorized users', async function () {
      const admins = [await admin.getAddress()];

      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      const encryptedKeyReturned = await roleUpgrade
        .connect(admin)
        .getEncryptedKeyForCaller(1);

      // Convert both to hex strings for comparison
      const expectedHex = ethers.hexlify(encryptedKey[0]);
      expect(encryptedKeyReturned).to.equal(expectedHex);
    });

    it('Should require non-empty CID', async function () {
      const admins = [await admin.getAddress()];

      await expect(
        roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            '',
            2,
            admins,
            encryptedKey
          )
      ).to.be.revertedWith('CID cannot be empty');
    });

    it('Should require matching admin and key arrays', async function () {
      const admins = [await admin.getAddress()];
      const mismatchedKeys = [
        ethers.toUtf8Bytes('Key1'),
        ethers.toUtf8Bytes('Key2'),
      ];

      await expect(
        roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            2,
            admins,
            mismatchedKeys
          )
      ).to.be.revertedWith('Admins and encrypted keys length mismatch');
    });

    it('Should require user to be registered', async function () {
      const admins = [await admin.getAddress()];

      await expect(
        roleUpgrade
          .connect(insurer)
          .submitUpgradeRequest(
            await insurer.getAddress(),
            cid,
            2,
            admins,
            encryptedKey
          )
      ).to.be.revertedWith('User not registered');
    });

    it('Should allow an admin to register a public key', async function () {
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];
      const admins = [await admin.getAddress()];

      await roleUpgrade.connect(patient).submitUpgradeRequest(
        await patient.getAddress(),
        'QmCID123',
        4, // Admin role
        admins,
        encryptedKey
      );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress());

      //initialize a non empty key
      const publicKey = 'my-public-key';
      await roleUpgrade.connect(patient).registerAdminPublicKey(publicKey);

      const storedKey = await roleUpgrade.getAdminPublicKey(
        await patient.getAddress()
      );

      expect(storedKey).to.equal(publicKey);
    });

    it('Should handle empty admin public key', async function () {
      const emptyKey = '';

      await expect(
        roleUpgrade.connect(admin).registerAdminPublicKey(emptyKey)
      ).to.be.revertedWith('Public key cannot be empty');
    });

    it('Should return the correct public key for each admin', async function () {
      const [admin1Signer, admin2Signer] = await ethers.getSigners();
      const admin1 = await admin1Signer.getAddress();
      const admin2 = await admin2Signer.getAddress();
      const key1 = 'key-admin1';
      const key2 = 'key-admin2';

      await roleUpgrade.connect(admin1Signer).registerAdminPublicKey(key1);
      await roleUpgrade.connect(admin2Signer).registerAdminPublicKey(key2);

      expect(await roleUpgrade.getAdminPublicKey(admin1)).to.equal(key1);
      expect(await roleUpgrade.getAdminPublicKey(admin2)).to.equal(key2);
    });

    it('Should return the pending requests for a user(patient)', async function () {
      const admins = [await admin.getAddress()];

      //patient submits upgrade role request to admin(s)
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      const pendingRequests = await roleUpgrade
        .connect(patient)
        .getPendingRequestByUser(await patient.getAddress());

      expect(pendingRequests.length).to.equal(1);
      expect(pendingRequests[0].requestId).to.equal(1);
      expect(pendingRequests[0].newRole).to.equal(2);
      expect(pendingRequests[0].requester).to.equal(await patient.getAddress());
      expect(pendingRequests[0].isProcessed).to.be.false;
      expect(pendingRequests[0].isApproved).to.be.false;
      expect(pendingRequests[0].cid).to.equal(cid);
    });

    it('Should return multiple pending requests for admin', async function () {
      const admins = [await admin.getAddress()];

      // Register doctor as patient
      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Patient submits request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      // Doctor submits request
      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        );

      // Get pending requests for admin
      const pendingRequests = await roleUpgrade.getPendingRequestsByAdmin(
        await admin.getAddress()
      );

      expect(pendingRequests.length).to.equal(2);
      expect(pendingRequests[0].requestId).to.equal(1);
      expect(pendingRequests[1].requestId).to.equal(2);
    });

    it('Should not return processed requests for admin', async function () {
      const admins = [await admin.getAddress()];

      // Submit request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      // Admin approves
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress());

      // Check pending (should be empty)
      const pendingRequests = await roleUpgrade.getPendingRequestsByAdmin(
        await admin.getAddress()
      );

      expect(pendingRequests.length).to.equal(0);
    });

    it('Should return pending requests for admin', async function () {
      const admins = [await admin.getAddress()];

      // Patient submits upgrade request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      // Get pending requests for admin
      const pendingRequests = await roleUpgrade.getPendingRequestsByAdmin(
        await admin.getAddress()
      );

      expect(pendingRequests.length).to.equal(1);
      expect(pendingRequests[0].requestId).to.equal(1);
      expect(pendingRequests[0].requester).to.equal(await patient.getAddress());
      expect(pendingRequests[0].isProcessed).to.be.false;
    });

    it('Should return multiple pending requests for admin', async function () {
      const admins = [await admin.getAddress()];

      // Register doctor as patient
      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Patient submits request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      // Doctor submits request
      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        );

      // Get pending requests for admin
      const pendingRequests = await roleUpgrade.getPendingRequestsByAdmin(
        await admin.getAddress()
      );

      expect(pendingRequests.length).to.equal(2);
      expect(pendingRequests[0].requestId).to.equal(1);
      expect(pendingRequests[1].requestId).to.equal(2);
    });

    it('Should not return processed requests for admin', async function () {
      const admins = [await admin.getAddress()];

      // Submit request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      // Admin approves
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress());

      // Check pending (should be empty)
      const pendingRequests = await roleUpgrade.getPendingRequestsByAdmin(
        await admin.getAddress()
      );

      expect(pendingRequests.length).to.equal(0);
    });

    it('Should return acknowledged requests for admin', async function () {
      const admins = [await admin.getAddress()];

      // Submit request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      // Admin approves
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress());

      // Get acknowledged requests
      const acknowledgedRequests =
        await roleUpgrade.getAcknowledgedRequestsByAdmin(
          await admin.getAddress()
        );

      expect(acknowledgedRequests.length).to.equal(1);
      expect(acknowledgedRequests[0].requestId).to.equal(1);
      expect(acknowledgedRequests[0].isProcessed).to.be.true;
      expect(acknowledgedRequests[0].isApproved).to.be.true;
    });

    it('Should return both approved and rejected requests', async function () {
      const admins = [await admin.getAddress()];

      // Register doctor
      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Patient submits request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey
        );

      // Doctor submits request
      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        );

      // Admin approves patient's request
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress());

      // Admin rejects doctor's request
      await roleUpgrade.connect(admin).rejectRequest(2);

      // Get acknowledged requests
      const acknowledgedRequests =
        await roleUpgrade.getAcknowledgedRequestsByAdmin(
          await admin.getAddress()
        );

      expect(acknowledgedRequests.length).to.equal(2);
      expect(acknowledgedRequests[0].isApproved).to.be.true;
      expect(acknowledgedRequests[1].isApproved).to.be.false;
    });

    describe('getRequestAdminAddresses', function () {
      it('Should return the admin addresses for a request', async function () {
        const admins = [await admin.getAddress()];

        await roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            2,
            admins,
            encryptedKey
          );

        const requestAdmins = await roleUpgrade.getRequestAdminAddresses(1);

        expect(requestAdmins.length).to.equal(1);
        expect(requestAdmins[0]).to.equal(await admin.getAddress());
      });

      it('Should return multiple admin addresses for a request', async function () {
        await healthcareSystem
          .connect(doctor)
          .registerUser(await doctor.getAddress(), doctorHashedId, 1);

        const initialAdmins = [await admin.getAddress()];
        const initialEncryptedKey = [ethers.toUtf8Bytes('Key')];

        await roleUpgrade
          .connect(doctor)
          .submitUpgradeRequest(
            await doctor.getAddress(),
            'QmDoctorAdminCID',
            4,
            initialAdmins,
            initialEncryptedKey
          );

        await roleUpgrade
          .connect(admin)
          .approveRequest(1, await doctor.getAddress());

        const multipleAdmins = [
          await admin.getAddress(),
          await doctor.getAddress()
        ];
        const multipleKeys = [
          ethers.toUtf8Bytes('Key1'),
          ethers.toUtf8Bytes('Key2')
        ];

        await roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            2,
            multipleAdmins,
            multipleKeys
          );

        const requestAdmins = await roleUpgrade.getRequestAdminAddresses(2);

        expect(requestAdmins.length).to.equal(2);
        expect(requestAdmins).to.include(await admin.getAddress());
        expect(requestAdmins).to.include(await doctor.getAddress());
      });

      it('Should return empty array for non-existent request', async function () {
        const requestAdmins = await roleUpgrade.getRequestAdminAddresses(999);
        expect(requestAdmins.length).to.equal(0);
      });

      it('Should maintain admin addresses after request is processed', async function () {
        const admins = [await admin.getAddress()];

        await roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            2,
            admins,
            encryptedKey
          );

        await roleUpgrade
          .connect(admin)
          .approveRequest(1, await patient.getAddress());

        const requestAdmins = await roleUpgrade.getRequestAdminAddresses(1);

        expect(requestAdmins.length).to.equal(1);
        expect(requestAdmins[0]).to.equal(await admin.getAddress());
      });
    });
  });

  describe('Integration Tests', function () {
    const recordId = 'LAB_001';

    beforeEach(async function () {
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Upgrade doctor to HealthcareProvider
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress());

      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey
        );
    });

    it('Should allow authorized updates to medical records', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      const newPatientKey = ethers.toUtf8Bytes('new-aes-key-for-patient');
      await expect(
        medicalRecords
          .connect(doctor)
          .updateRecord(
            await patient.getAddress(),
            recordId,
            'QmEncryptedCidV2',
            'Follow-up required',
            await accessControl.getAddress(),
            newPatientKey
          )
      ).to.emit(medicalRecords, 'RecordUpdated');

      const updatedRecord = await medicalRecords.patientMedicalRecord(
        await patient.getAddress(),
        recordId
      );
      expect(updatedRecord.cid).to.equal('QmEncryptedCidV2');
    });

    it('Should prevent unauthorized updates', async function () {
      // Don't grant access - doctor should not be able to update
      const newPatientKey = ethers.toUtf8Bytes('new-aes-key-for-patient');
      await expect(
        medicalRecords.connect(doctor).updateRecord(
          await patient.getAddress(),
          recordId,
          'QmEncryptedCidV2',
          'Follow-up required',
          await accessControl.getAddress(),
          newPatientKey
        )
      ).to.be.revertedWith('No access to this record');
    });

    it('Should maintain update history', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      const newPatientKey = ethers.toUtf8Bytes('new-aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .updateRecord(
          await patient.getAddress(),
          recordId,
          'QmEncryptedCidV2',
          'Routine update',
          await accessControl.getAddress(),
          newPatientKey
        );

      const history = await medicalRecords
        .connect(patient)
        .getRecordHistory(
          await patient.getAddress(),
          recordId,
          await accessControl.getAddress()
        );

      expect(history.length).to.equal(1);
      expect(history[0].fieldUpdated).to.equal('cid');
      expect(history[0].updatedBy).to.equal(await doctor.getAddress());
      expect(history[0].updateReason).to.equal('Routine update');
    });

    it('Should allow patients to view their own record history', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      const newPatientKey = ethers.toUtf8Bytes('new-aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .updateRecord(
          await patient.getAddress(),
          recordId,
          'QmEncryptedCidV2',
          'Test update',
          await accessControl.getAddress(),
          newPatientKey
        );

      const history = await medicalRecords
        .connect(patient)
        .getRecordHistory(
          await patient.getAddress(),
          recordId,
          await accessControl.getAddress()
        );

      expect(history.length).to.equal(1);
    });

    it('Should prevent unauthorized access to record history', async function () {
      await expect(
        medicalRecords
          .connect(doctor)
          .getRecordHistory(
            await patient.getAddress(),
            recordId,
            await accessControl.getAddress()
          )
      ).to.be.revertedWith('No authorized access to view history');
    });
  });

  describe('MedicalRecordsManagement - New Functions', function () {
    const recordId = 'LAB_001';

    beforeEach(async function () {
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Upgrade doctor to HealthcareProvider
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress());

      // Add medical record
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey
        );
    });

    it('Should return medical record using getMedicalRecord', async function () {
      const record = await medicalRecords.getMedicalRecord(
        await patient.getAddress(),
        recordId
      );

      expect(record.medicalRecordID).to.equal(recordId);
      expect(record.patientAddress).to.equal(await patient.getAddress());
      expect(record.cid).to.equal('QmHash123');
    });

    it('Should return false for non-existent record using recordExists', async function () {
      expect(
        await medicalRecords.recordExists(
          await patient.getAddress(),
          'NON_EXISTENT'
        )
      ).to.be.false;
    });

    it('Should return true for existing record using recordExists', async function () {
      expect(
        await medicalRecords.recordExists(
          await patient.getAddress(),
          recordId
        )
      ).to.be.true;
    });

    it('Should allow patient to get their own encrypted key', async function () {
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      const retrievedKey = await medicalRecords
        .connect(patient)
        .getEncryptedKeyForPatient(recordId, await patient.getAddress());

      expect(ethers.hexlify(retrievedKey)).to.equal(ethers.hexlify(patientKey));
    });

    it('Should prevent non-patients from getting patient encrypted key', async function () {
      await expect(
        medicalRecords
          .connect(doctor)
          .getEncryptedKeyForPatient(recordId, await patient.getAddress())
      ).to.be.revertedWith('Only the patient can retrieve their own key');
    });

    it('Should allow patient to get encrypted key using getEncryptedKey', async function () {
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      const retrievedKey = await medicalRecords
        .connect(patient)
        .getEncryptedKey(
          recordId,
          await patient.getAddress(),
          await accessControl.getAddress()
        );

      expect(ethers.hexlify(retrievedKey)).to.equal(ethers.hexlify(patientKey));
    });

    it('Should allow doctor with access to get encrypted key using getEncryptedKey', async function () {
      // Share record with doctor (this stores encrypted key for doctor)
      const doctorKey = ethers.toUtf8Bytes('aes-key-for-doctor');
      await medicalRecords
        .connect(patient)
        .shareMedicalRecord(
          await patient.getAddress(),
          recordId,
          await doctor.getAddress(),
          await accessControl.getAddress(),
          doctorKey
        );

      // Doctor should be able to retrieve their encrypted key
      const retrievedKey = await medicalRecords
        .connect(doctor)
        .getEncryptedKey(
          recordId,
          await patient.getAddress(),
          await accessControl.getAddress()
        );

      expect(ethers.hexlify(retrievedKey)).to.equal(ethers.hexlify(doctorKey));
    });

    it('Should prevent doctor without access from getting encrypted key', async function () {
      await expect(
        medicalRecords
          .connect(doctor)
          .getEncryptedKey(
            recordId,
            await patient.getAddress(),
            await accessControl.getAddress()
          )
      ).to.be.revertedWith('No access to this record');
    });

    it('Should prevent getting encrypted key for non-existent record', async function () {
      await expect(
        medicalRecords
          .connect(patient)
          .getEncryptedKey(
            'NON_EXISTENT',
            await patient.getAddress(),
            await accessControl.getAddress()
          )
      ).to.be.revertedWith('Record does not exist');
    });
  });

  describe('Edge Cases and Security', function () {
    it('Should handle empty record ID', async function () {
      const recordId = '';
      await healthcareSystem //the patient that the new doctor will add record for
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Upgrade patient to HealthcareProvider
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress());

      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await expect(
        medicalRecords
          .connect(doctor)
          .addMedicalRecord(
            await patient.getAddress(),
            recordId,
            'QmHash123',
            patientKey
          )
      ).to.be.revertedWith('Medical record ID required');
    });

    it('Should handle zero address', async function () {
      await expect(
        healthcareSystem
          .connect(patient)
          .registerUser(
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            0
          )
      ).to.be.revertedWith('Encrypted ID required');
    });

    it('Should prevent updates to non-updatable fields', async function () {
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await healthcareSystem //register patient as doctor first
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Upgrade doctor to HealthcareProvider
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress());

      const recordId = 'LAB_001';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey
        );

      await accessControl
        .connect(patient)
        .grantAccess(await patient.getAddress(), await doctor.getAddress(), recordId);

      const newPatientKey = ethers.toUtf8Bytes('new-aes-key-for-patient');
      // updateRecord now only updates CID, so this should work
      await expect(
        medicalRecords
          .connect(doctor)
          .updateRecord(
            await patient.getAddress(),
            recordId,
            'QmHackedCid',
            'Evil update',
            await accessControl.getAddress(),
            newPatientKey
          )
      ).to.emit(medicalRecords, 'RecordUpdated');
    });

    it('Should return the newly added admins', async function () {
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];
      const admins = [await admin.getAddress()];

      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await roleUpgrade.connect(patient).submitUpgradeRequest(
        await patient.getAddress(),
        'QmCID123',
        4, // Admin role
        admins,
        encryptedKey
      );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress());
      const adminList = await roleUpgrade.connect(patient).getAdmins();

      expect(adminList).to.include(await admin.getAddress());
      expect(adminList).to.include(await patient.getAddress());
      expect(adminList.length).to.equal(2);
    });
  });
});
