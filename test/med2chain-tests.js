const { expect } = require('chai');
const { ethers } = require('hardhat');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

describe('Healthcare System Contracts', function () {
  let userManagement;
  let medicalRecords;
  let accessControl;
  let healthcareSystem;
  let roleUpgrade;
  let claimRequest;
  let admin, patient, doctor, insurer;

  const adminHashedId =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const patientHashedId =
    '0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef1';
  const doctorHashedId =
    '0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12';
  const insurerHashedId =
    '0x4567890123def1234567890123def1234567890123def1234567890123def123';

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

    //Deploy ClaimRequest
    const ClaimRequest = await ethers.getContractFactory('ClaimRequest');
    claimRequest = await ClaimRequest.deploy(
      await userManagement.getAddress(),
      await medicalRecords.getAddress(),
      await accessControl.getAddress()
    );
    await claimRequest.waitForDeployment();

    // Deploy HealthcareSystem
    const HealthcareSystem = await ethers.getContractFactory(
      'HealthcareSystem'
    );
    healthcareSystem = await HealthcareSystem.deploy(
      await userManagement.getAddress(),
      await medicalRecords.getAddress(),
      await accessControl.getAddress(),
      await roleUpgrade.getAddress(),
      await claimRequest.getAddress()
    );
    await healthcareSystem.waitForDeployment();



    // Authorize RoleUpgrade contract to set user roles
    await userManagement
      .connect(admin)
      .authorizeContract(await roleUpgrade.getAddress());

    // Authorize HealthcareSystem contract (needed for registerUser wrapper)
    await userManagement
      .connect(admin)
      .authorizeContract(await healthcareSystem.getAddress());
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

      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

      await roleUpgrade.connect(patient).submitUpgradeRequest(
        await patient.getAddress(),
        'QmTestCID',
        2,
        admins,
        encryptedKey,
        '',
        'Dr. Test' 
      );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(), 'Dr. Patient'); // Add roleName

      expect(await userManagement.userExists(await patient.getAddress())).to.be.true;
      expect(await userManagement.getUserRole(await patient.getAddress())).to.equal(2);
    });

    it('Should return all patient addresses correctly', async function () {
      // Register patient 1
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      // Register patient 2
      const signers = await ethers.getSigners();
      const patient2 = signers[4];
      const patient2HashedId = ethers.keccak256(ethers.toUtf8Bytes('patient2'));
      
      await healthcareSystem
        .connect(patient2)
        .registerUser(await patient2.getAddress(), patient2HashedId, 1);

      const patientAddresses = await userManagement.getAllPatientAddresses();
      
      expect(patientAddresses.length).to.equal(2);
      expect(patientAddresses).to.include(await patient.getAddress());
      expect(patientAddresses).to.include(await patient2.getAddress());
      expect(patientAddresses).to.not.include(await admin.getAddress());
    });

    it('Should allow admin to create another admin', async function () {
      const newAdmin = doctor; 
      const encryptedId = ethers.keccak256(ethers.toUtf8Bytes('newAdmin'));
      
      await healthcareSystem
        .connect(admin)
        .registerUser(await newAdmin.getAddress(), encryptedId, 4);

      const role = await userManagement.getUserRole(await newAdmin.getAddress());
      expect(role).to.equal(4);
    });

    it('Should prevent non-admin from creating admin', async function () {
      const newAdmin = doctor;
      const encryptedId = ethers.keccak256(ethers.toUtf8Bytes('newAdmin'));
      
      await expect(
        healthcareSystem
          .connect(patient)
          .registerUser(await newAdmin.getAddress(), encryptedId, 4)
      ).to.be.revertedWith('Only admin can register other roles');
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
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress(), 'Dr. Doctor Name');
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
          patientKey,
          'Blood Test',
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
            patientKey,
            'Blood Test',
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
          patientKey,
          'Blood Test',
        );

      await expect(
        medicalRecords
          .connect(doctor)
          .addMedicalRecord(
            await patient.getAddress(),
            recordId,
            'QmHash124',
            patientKey,
            'Blood Test',
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
          patientKey,
          'Blood Test',
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
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
        )

        await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress(), 'Dr. Doctor Name');
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
          patientKey,
          'Blood Test',
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
          patientKey,
          'Blood Test',
        )
      
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId2,
          'QmHash124',
          patientKey,
          'Blood Test',
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
          patientKey,
          'Blood Test',
        )
      
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
        await patient2.getAddress(),
        recordId2,
        'QmHash124',
        patientKey,
        'Blood Test',
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
          patientKey,
          'Blood Test',
        )

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId2, 
          'QmHash124',
          patientKey,
          'Blood Test',
        )
      
      const recordCount = await medicalRecords.recordCount(await patient.getAddress());
      expect(recordCount).to.equal(2);
      const recordIDcount = await medicalRecords.getPatientRecordIDs(await patient.getAddress());
      expect(recordIDcount.length).to.equal(2);
    })

    it('Should preserve order of record IDs as they are added', async function () {
      const recordIds = ['LAB_001', 'XRAY_001', 'MRI_001', 'BLOOD_001'];
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      const recordType = ['Blood_Test_001', 'Blood_Test_002', 'Blood_Test_003', 'Blood_Test_004']

      for (let i = 0; i < recordIds.length; i++) {
        await medicalRecords
          .connect(doctor)
          .addMedicalRecord(
            await patient.getAddress(),
            recordIds[i],
            `QmCid${i}`,
            patientKey,
            recordType[i],
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
    const recordId2 = 'LAB_002';
    const aesKey = ethers.toUtf8Bytes('aes-key-for-patient1');

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
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress(), 'Dr. Doctor Name');

      // Add medical record
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey,
          'Blood Test',
        );

      await medicalRecords
      .connect(doctor)
      .addMedicalRecord(
        await patient.getAddress(),
        recordId2,
        'QmHash124',
        patientKey,
        'Blood Test',
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
          patient2Key,
          'Blood Test',
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
          patient2Key,
          'Blood Test',
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

  it('Should allow patients to store encrypted AES key for active recipients', async function () {
    const signers = await ethers.getSigners();
    const patient2 = signers[4];
    
    await healthcareSystem
      .connect(patient2)
      .registerUser(
        await patient2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient2')),
        1
      );

    await expect(
      accessControl
        .connect(patient)
        .storeEncryptedAESKey(
          await patient.getAddress(),
          await patient2.getAddress(),
          recordId,
          ethers.hexlify(aesKey)
        )
    )
      .to.emit(accessControl, 'EncryptedKeyStored')
      .withArgs(
        await patient.getAddress(),
        await patient2.getAddress(),
        recordId,
        await ethers.provider.getBlock('latest').then(b => b.timestamp + 1)
      );
  });

  it('Should prevent storing empty encrypted keys', async function () {
    const signers = await ethers.getSigners();
    const patient2 = signers[4];
    
    await healthcareSystem
      .connect(patient2)
      .registerUser(
        await patient2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient2')),
        1
      );

    await expect(
      accessControl
        .connect(patient)
        .storeEncryptedAESKey(
          await patient.getAddress(),
          await patient2.getAddress(),
          recordId,
          '0x'
        )
    ).to.be.revertedWith('Key cannot be empty');
  });

  it('Should prevent storing keys for inactive recipients', async function () {
    const signers = await ethers.getSigners();
    const inactiveUser = signers[5];

    await expect(
      accessControl
        .connect(patient)
        .storeEncryptedAESKey(
          await patient.getAddress(),
          await inactiveUser.getAddress(),
          recordId,
          ethers.hexlify(aesKey)
        )
    ).to.be.revertedWith('Recipient is not active');
  });

  it('Should prevent non-patients from storing keys', async function () {
    const signers = await ethers.getSigners();
    const patient2 = signers[4];
    
    await healthcareSystem
      .connect(patient2)
      .registerUser(
        await patient2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient2')),
        1
      );

    await expect(
      accessControl
        .connect(doctor)
        .storeEncryptedAESKey(
          await patient.getAddress(),
          await patient2.getAddress(),
          recordId,
          ethers.hexlify(aesKey)
        )
    ).to.be.revertedWith('Only patients are allowed to share their AES Key');
  });

  it('Should prevent patients from storing keys for other patients records', async function () {
    const signers = await ethers.getSigners();
    const patient2 = signers[4];
    const patient3 = signers[5];
    
    await healthcareSystem
      .connect(patient2)
      .registerUser(
        await patient2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient2')),
        1
      );

    await healthcareSystem
      .connect(patient3)
      .registerUser(
        await patient3.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient3')),
        1
      );

    await expect(
      accessControl
        .connect(patient2)
        .storeEncryptedAESKey(
          await patient.getAddress(), // Different patient's address
          await patient3.getAddress(),
          recordId,
          ethers.hexlify(aesKey)
        )
    ).to.be.revertedWith('Patients can only revoke access from their own records'); 
  });

  it('Should allow retrieving encrypted key when access is granted', async function () {
    const signers = await ethers.getSigners();
    const patient2 = signers[4];
    
    await healthcareSystem
      .connect(patient2)
      .registerUser(
        await patient2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient2')),
        1
      );

    // First grant access
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await patient2.getAddress(),
        recordId
      );

    // Then store the key
    const keyHex = ethers.hexlify(aesKey);
    await accessControl
      .connect(patient)
      .storeEncryptedAESKey(
        await patient.getAddress(),
        await patient2.getAddress(),
        recordId,
        keyHex
      );

    // Retrieve the key
    const retrievedKey = await accessControl.getEncryptedAESKey(
      await patient.getAddress(),
      await patient2.getAddress(),
      recordId
    );

    expect(retrievedKey).to.equal(keyHex);
  });

  it('Should prevent retrieving key without access', async function () {
    const signers = await ethers.getSigners();
    const patient2 = signers[4];
    
    await healthcareSystem
      .connect(patient2)
      .registerUser(
        await patient2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient2')),
        1
      );

    // Store key without granting access first
    const keyHex = ethers.hexlify(aesKey);
    await accessControl
      .connect(patient)
      .storeEncryptedAESKey(
        await patient.getAddress(),
        await patient2.getAddress(),
        recordId,
        keyHex
      );

    // Try to retrieve without access - should fail
    await expect(
      accessControl.getEncryptedAESKey(
        await patient.getAddress(),
        await patient2.getAddress(),
        recordId
      )
    ).to.be.revertedWith(
      "Only insurers, doctors, and patients can get a patient's encrypted AES Key"
    );
  });

  it('Should allow updating encrypted key for same recipient', async function () {
    const signers = await ethers.getSigners();
    const patient2 = signers[4];
    
    await healthcareSystem
      .connect(patient2)
      .registerUser(
        await patient2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient2')),
        1
      );

    // Grant access
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await patient2.getAddress(),
        recordId
      );

    // Store first key
    const key1 = ethers.hexlify(ethers.toUtf8Bytes('first-key'));
    await accessControl
      .connect(patient)
      .storeEncryptedAESKey(
        await patient.getAddress(),
        await patient2.getAddress(),
        recordId,
        key1
      );

    // Update with new key
    const key2 = ethers.hexlify(ethers.toUtf8Bytes('second-key'));
    await accessControl
      .connect(patient)
      .storeEncryptedAESKey(
        await patient.getAddress(),
        await patient2.getAddress(),
        recordId,
        key2
      );

    // Should return the updated key
    const retrievedKey = await accessControl.getEncryptedAESKey(
      await patient.getAddress(),
      await patient2.getAddress(),
      recordId
    );

    expect(retrievedKey).to.equal(key2);
  
  });

    it('Should return empty array when user has no shared records', async function () {
    const sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );
    expect(sharedRecords.length).to.equal(0);
  });

  it('Should track shared record when access is granted', async function () {
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    const sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );

    expect(sharedRecords.length).to.equal(1);
    expect(sharedRecords[0].patientAddress).to.equal(
      await patient.getAddress()
    );
    expect(sharedRecords[0].recordId).to.equal(recordId);
    expect(sharedRecords[0].timestamp).to.be.greaterThan(0);
  });

  it('Should track multiple shared records for same user', async function () {
    // Grant access to first record
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    // Grant access to second record
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId2
      );

    const sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );

    expect(sharedRecords.length).to.equal(2);
    expect(sharedRecords[0].recordId).to.equal(recordId);
    expect(sharedRecords[1].recordId).to.equal(recordId2);
  });

  it('Should track shared records from different patients', async function () {
    // Register second patient
    const signers = await ethers.getSigners();
    const patient2 = signers[4];

    await healthcareSystem
      .connect(patient2)
      .registerUser(
        await patient2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient2')),
        1
      );

    // Add record for patient2
    const recordId3 = 'LAB_003';
    const patient2Key = ethers.toUtf8Bytes('aes-key-for-patient2');
    await medicalRecords
      .connect(doctor)
      .addMedicalRecord(
        await patient2.getAddress(),
        recordId3,
        'QmHash125',
        patient2Key,
        'Blood Test',
      );

    // Both patients grant access to doctor
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    await accessControl
      .connect(patient2)
      .grantAccess(
        await patient2.getAddress(),
        await doctor.getAddress(),
        recordId3
      );

    const sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );

    expect(sharedRecords.length).to.equal(2);
    expect(sharedRecords[0].patientAddress).to.equal(
      await patient.getAddress()
    );
    expect(sharedRecords[1].patientAddress).to.equal(
      await patient2.getAddress()
    );
  });

  it('Should remove shared record from tracking when access is revoked', async function () {
    // Grant access
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    // Verify it's tracked
    let sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );
    expect(sharedRecords.length).to.equal(1);

    // Revoke access
    await accessControl
      .connect(patient)
      .revokeAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    // Verify it's removed from tracking
    sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );
    expect(sharedRecords.length).to.equal(0);
  });

  it('Should only remove the correct record when revoking from multiple shared records', async function () {
    // Grant access to both records
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId2
      );

    // Revoke access to first record only
    await accessControl
      .connect(patient)
      .revokeAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    const sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );

    expect(sharedRecords.length).to.equal(1);
    expect(sharedRecords[0].recordId).to.equal(recordId2);
  });

  it('Should return correct shared record count', async function () {
    // Initially zero
    let count = await accessControl.getSharedRecordCount(
      await doctor.getAddress()
    );
    expect(count).to.equal(0);

    // Grant access to first record
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    count = await accessControl.getSharedRecordCount(
      await doctor.getAddress()
    );
    expect(count).to.equal(1);

    // Grant access to second record
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId2
      );

    count = await accessControl.getSharedRecordCount(
      await doctor.getAddress()
    );
    expect(count).to.equal(2);

    // Revoke one
    await accessControl
      .connect(patient)
      .revokeAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    count = await accessControl.getSharedRecordCount(
      await doctor.getAddress()
    );
    expect(count).to.equal(1);
  });

  it('Should not allow duplicate shared record tracking', async function () {
    // Grant access
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    // Try to grant again (should revert with "Access already granted")
    await expect(
      accessControl
        .connect(patient)
        .grantAccess(
          await patient.getAddress(),
          await doctor.getAddress(),
          recordId
        )
    ).to.be.revertedWith('Access already granted');

    // Verify only one entry
    const sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );
    expect(sharedRecords.length).to.equal(1);
  });

  it('Should preserve timestamps for each shared record', async function () {
    // Grant access to first record
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    // Wait a bit (mine a new block)
    await ethers.provider.send('evm_mine');

    // Grant access to second record
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId2
      );

    const sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );

    expect(sharedRecords.length).to.equal(2);
    expect(sharedRecords[0].timestamp).to.be.lessThan(
      sharedRecords[1].timestamp
    );
  });

  it('Should handle revoke when sharedWithUser array has multiple entries', async function () {
    const signers = await ethers.getSigners();
    const patient2 = signers[4];

    await healthcareSystem
      .connect(patient2)
      .registerUser(
        await patient2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('patient2')),
        1
      );
      
  const recordId3 = 'LAB_003';
  const patient2Key = ethers.toUtf8Bytes('aes-key-for-patient2');
  await medicalRecords
    .connect(doctor)
    .addMedicalRecord(
      await patient2.getAddress(),
      recordId3,
      'QmHash125',
      patient2Key,
      'Blood Test'
    );

    // Grant multiple accesses
    await accessControl
      .connect(patient)
      .grantAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    await accessControl
      .connect(patient2)
      .grantAccess(
        await patient2.getAddress(),
        await doctor.getAddress(),
        recordId3
      );

    // Revoke the first one
    await accessControl
      .connect(patient)
      .revokeAccess(
        await patient.getAddress(),
        await doctor.getAddress(),
        recordId
      );

    const sharedRecords = await accessControl.getSharedRecords(
      await doctor.getAddress()
    );

    expect(sharedRecords.length).to.equal(1);
    expect(sharedRecords[0].patientAddress).to.equal(
      await patient2.getAddress()
    );
    expect(sharedRecords[0].recordId).to.equal(recordId3);
  });
});

  describe('RoleUpgrade', function () {
    const cid = 'Qm123abcCIDExample';
    const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

    beforeEach(async function () {
      // No registration needed - testing unregistered users submitting upgrade requests
    });

    it('Should allow unregistered users to request role upgrade', async function () {
      const admins = [await admin.getAddress()];

      await expect(
        roleUpgrade
          .connect(patient)  // 'patient' is just a signer variable name, user is actually unregistered
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            2,
            admins,
            encryptedKey,
            '',
            'Dr. Patient Name' // Add doctor name
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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
        );

      await expect(
        roleUpgrade.connect(admin).approveRequest(1, await patient.getAddress(),'Dr. Patient Name')
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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
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

      // User should remain unregistered since request was rejected
      const role = await userManagement.getUserRole(await patient.getAddress());
      expect(role).to.equal(0); // Unregistered
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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
        );

      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      await expect(
        roleUpgrade
          .connect(doctor)
          .approveRequest(1, await patient.getAddress(),'HealthcareProvider')
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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
        );

      await expect(
        roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            3,
            admins,
            encryptedKey,
            '',
            ''
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
            encryptedKey,
            '',
            'Dr. Doctor Name' // Add doctor name
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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
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
            encryptedKey,
            '',
            'Dr. Patient Name' // Add doctor name
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
            mismatchedKeys,
            '',
            'Dr. Patient Name' // Add doctor name
          )
      ).to.be.revertedWith('Admins and encrypted keys length mismatch');
    });



    it('Should require company name for insurer role', async function () {
      const admins = [await admin.getAddress()];

      await expect(
        roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            3, // Insurer role
            admins,
            encryptedKey,
            '', // Empty company name (should fail)
            ''
          )
      ).to.be.revertedWith('Company name cannot be empty for insurer role');
    });

    it('Should require doctor name for healthcare provider role', async function () {
      const admins = [await admin.getAddress()];

      await expect(
        roleUpgrade
          .connect(patient)
          .submitUpgradeRequest(
            await patient.getAddress(),
            cid,
            2, // HealthcareProvider role
            admins,
            encryptedKey,
            '',
            '' // Empty doctor name (should fail)
          )
      ).to.be.revertedWith('Doctor name cannot be empty for healthcare provider role');
    });

    it('Should prevent duplicate company names for insurers', async function () {
      const admins = [await admin.getAddress()];
      
      // Get second user (no registration needed)
      const signers = await ethers.getSigners();
      const patient2 = signers[4];

      // First insurer request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          3, // Insurer
          admins,
          encryptedKey,
          'Medicare Insurance',
          ''
        );

      // Approve first request
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(), 'Medicare Insurance');

      // Second patient tries to use same company name
      await expect(
        roleUpgrade
          .connect(patient2)
          .submitUpgradeRequest(
            await patient2.getAddress(),
            'QmCID2',
            3, // Insurer
            admins,
            encryptedKey,
            'Medicare Insurance', // Same company name
            ''
          )
      ).to.be.revertedWith('Company name already registered');
    });

    it('Should return all registered insurers with their company names', async function () {
      const admins = [await admin.getAddress()];

      // Register and approve insurer
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          3, // Insurer
          admins,
          encryptedKey,
          'Medicare Insurance',
          ''
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(), 'Medicare Insurance');

      const [addresses, names] = await roleUpgrade.getAllInsurers();

      expect(addresses.length).to.equal(1);
      expect(names.length).to.equal(1);
      expect(addresses[0]).to.equal(await patient.getAddress());
      expect(names[0]).to.equal('Medicare Insurance');
    });

    it('Should return all registered healthcare providers with their names', async function () {
      const admins = [await admin.getAddress()];

      // Register and approve provider
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2, // HealthcareProvider
          admins,
          encryptedKey,
          '',
          'Dr. John Smith'
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(), 'Dr. John Smith');

      const [addresses, names] = await roleUpgrade.getAllProviders();

      expect(addresses.length).to.equal(1);
      expect(names.length).to.equal(1);
      expect(addresses[0]).to.equal(await patient.getAddress());
      expect(names[0]).to.equal('Dr. John Smith');
    });

    it('Should allow an admin to register a public key', async function () {
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];
      const admins = [await admin.getAddress()];

      await roleUpgrade.connect(patient).submitUpgradeRequest(
        await patient.getAddress(),
        'QmCID123',
        4, // Admin role
        admins,
        encryptedKey,
        '',
        ''
      );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(),'');

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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
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


      // Doctor doesn't need registration - can submit upgrade request directly

      // Patient submits request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
        );

      // Doctor submits request
      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
        );

      // Admin approves
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(),'HealthcareProvider');

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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
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


      // Doctor doesn't need registration - can submit upgrade request directly

      // Patient submits request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
        );

      // Doctor submits request
      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
        );

      // Admin approves
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(), 'HealthcareProvider');

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
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
        );

      // Admin approves
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(), 'HealthcareProvider');

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

      // Doctor doesn't need registration - can submit upgrade request directly


      // Patient submits request
      await roleUpgrade
        .connect(patient)
        .submitUpgradeRequest(
          await patient.getAddress(),
          cid,
          2,
          admins,
          encryptedKey,
          '',
          'Dr. Patient Name' // Add doctor name
        );

      // Doctor submits request
      await roleUpgrade
        .connect(doctor)
        .submitUpgradeRequest(
          await doctor.getAddress(),
          'QmDoctorCID',
          2,
          admins,
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
        );

      // Admin approves patient's request
      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(),'HealthcareProvider');

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
            encryptedKey,
            '',
            'Dr. Patient Name' // Add doctor name
          );

        const requestAdmins = await roleUpgrade.getRequestAdminAddresses(1);

        expect(requestAdmins.length).to.equal(1);
        expect(requestAdmins[0]).to.equal(await admin.getAddress());
      });

      it('Should return multiple admin addresses for a request', async function () {
        // Doctor doesn't need to be registered or upgraded to admin first
        // They can submit an upgrade request directly as an unregistered user
        
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
            multipleKeys,
            '',
            'Dr. Patient Name' // Add doctor name
          );

        const requestAdmins = await roleUpgrade.getRequestAdminAddresses(1);

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
            encryptedKey,
            '',
            'Dr. Doctor Name' // Add doctor name
          );

        await roleUpgrade
          .connect(admin)
          .approveRequest(1, await patient.getAddress(), 'HealthcareProvider');

        const requestAdmins = await roleUpgrade.getRequestAdminAddresses(1);

        expect(requestAdmins.length).to.equal(1);
        expect(requestAdmins[0]).to.equal(await admin.getAddress());
        });
      });
  });

describe('ClaimRequest', function () {
  const recordId = 'LAB_001';
  const recordId2 = 'LAB_002';

  beforeEach(async function () {
    // Register patient
    await healthcareSystem
      .connect(patient)
      .registerUser(await patient.getAddress(), patientHashedId, 1);

    // Register insurer as patient first
    await healthcareSystem
      .connect(insurer)
      .registerUser(await insurer.getAddress(), insurerHashedId, 1);

    // Register doctor as patient first
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
        encryptedKey,
        '',
        'Dr. Doctor Name' // Add doctor name
      );

    await roleUpgrade
      .connect(admin)
      .approveRequest(1, await doctor.getAddress(), 'Dr. Doctor Name');

    // Upgrade insurer to Insurer role
    await roleUpgrade
      .connect(insurer)
      .submitUpgradeRequest(
        await insurer.getAddress(),
        'QmInsurerCID',
        3,
        admins,
        encryptedKey,
        'Medicare Insurance', // Add company name
        '' // Empty doctor name for insurer
      );

    await roleUpgrade
      .connect(admin)
      .approveRequest(2, await insurer.getAddress(), 'Medicare Insurance');

    // Add medical records
    const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
    await medicalRecords
      .connect(doctor)
      .addMedicalRecord(
        await patient.getAddress(),
        recordId,
        'QmHash123',
        patientKey,
        'Blood Test'
      );

    await medicalRecords
      .connect(doctor)
      .addMedicalRecord(
        await patient.getAddress(),
        recordId2,
        'QmHash124',
        patientKey,
        'X-Ray'
      );

    // Patient shares record with insurer
    const insurerKey = ethers.toUtf8Bytes('aes-key-for-insurer');
    await medicalRecords
      .connect(patient)
      .shareMedicalRecord(
        await patient.getAddress(),
        recordId,
        await insurer.getAddress(),
        await accessControl.getAddress(),
        insurerKey
      );

    await medicalRecords
      .connect(patient)
      .shareMedicalRecord(
        await patient.getAddress(),
        recordId2,
        await insurer.getAddress(),
        await accessControl.getAddress(),
        insurerKey
      );
  });

  it('Should allow patients to submit claims', async function () {
    await expect(
      claimRequest
        .connect(patient)
        .submitClaim(
          await insurer.getAddress(),
          recordId,
          5000,
          'Surgery',
          'Appendectomy surgery claim',
          'QmClaimCID123'
        )
    )
      .to.emit(claimRequest, 'ClaimSubmitted')
      .withArgs(
        1,
        await patient.getAddress(),
        await insurer.getAddress(),
        recordId,
        5000,
        anyValue
      );
  });

  it('Should prevent non-patients from submitting claims', async function () {
    await expect(
      claimRequest
        .connect(doctor)
        .submitClaim(
          await insurer.getAddress(),
          recordId,
          5000,
          'Surgery',
          'Test claim',
          'QmClaimCID123'
        )
    ).to.be.revertedWith('Only patients can submit claims');
  });

  it('Should prevent claims for non-existent medical records', async function () {
    await expect(
      claimRequest
        .connect(patient)
        .submitClaim(
          await insurer.getAddress(),
          'NON_EXISTENT',
          5000,
          'Surgery',
          'Test claim',
          'QmClaimCID123'
        )
    ).to.be.revertedWith('Medical record does not exist');
  });

  it('Should prevent claims when insurer has no access to medical record', async function () {
    // Register another insurer without access
    const signers = await ethers.getSigners();
    const insurer2 = signers[5];

    await healthcareSystem
      .connect(insurer2)
      .registerUser(
        await insurer2.getAddress(),
        ethers.keccak256(ethers.toUtf8Bytes('insurer2')),
        1
      );

    const admins = [await admin.getAddress()];
    const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

    await roleUpgrade
      .connect(insurer2)
      .submitUpgradeRequest(
        await insurer2.getAddress(),
        'QmInsurer2CID',
        3,
        admins,
        encryptedKey,
        'HealthPlus Insurance', // Add company name
        '' // Empty doctor name for insurer
      );

    await roleUpgrade
      .connect(admin)
      .approveRequest(3, await insurer2.getAddress(), 'HealthPlus Insurance');

    await expect(
      claimRequest
        .connect(patient)
        .submitClaim(
          await insurer2.getAddress(),
          recordId,
          5000,
          'Surgery',
          'Test claim',
          'QmClaimCID123'
        )
    ).to.be.revertedWith('Insurer does not have access to this medical record');
  });

  it('Should retrieve claim details correctly', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Appendectomy surgery claim',
        'QmClaimCID123'
      );

    const claim = await claimRequest.getClaim(1);

    expect(claim.claimId).to.equal(1);
    expect(claim.patientAddress).to.equal(await patient.getAddress());
    expect(claim.insurerAddress).to.equal(await insurer.getAddress());
    expect(claim.medicalRecordID).to.equal(recordId);
    expect(claim.requestedAmount).to.equal(5000);
    expect(claim.approvedAmount).to.equal(0);
    expect(claim.claimType).to.equal('Surgery');
    expect(claim.description).to.equal('Appendectomy surgery claim');
    expect(claim.status).to.equal(0); // Pending
    expect(claim.notes).to.equal('');
    expect(claim.cid).to.equal('QmClaimCID123');
  });

  it('Should allow insurers to approve claims', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID123'
      );

    await expect(
      claimRequest
        .connect(insurer)
        .approveClaim(1, 4500, 'Approved with standard deductible')
    )
      .to.emit(claimRequest, 'ClaimProcessed')
      .withArgs(1, 1, 4500, anyValue); // 1 = Approved status

    const claim = await claimRequest.getClaim(1);
    expect(claim.status).to.equal(1); // Approved
    expect(claim.approvedAmount).to.equal(4500);
    expect(claim.notes).to.equal('Approved with standard deductible');
  });

  it('Should prevent non-authorized insurers from approving claims', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID123'
      );

    await expect(
      claimRequest.connect(doctor).approveClaim(1, 4500, 'Test approval')
    ).to.be.revertedWith('Only authorized insurer can access this claim');
  });

  it('Should prevent approving already processed claims', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID123'
      );

    await claimRequest
      .connect(insurer)
      .approveClaim(1, 4500, 'First approval');

    await expect(
      claimRequest.connect(insurer).approveClaim(1, 4000, 'Second approval')
    ).to.be.revertedWith('Claim has already been processed');
  });

  it('Should prevent approving with zero amount', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID123'
      );

    await expect(
      claimRequest.connect(insurer).approveClaim(1, 0, 'Zero approval')
    ).to.be.revertedWith('Approved amount must be greater than 0');
  });

  it('Should prevent approving amount exceeding requested amount', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID123'
      );

    await expect(
      claimRequest.connect(insurer).approveClaim(1, 6000, 'Excessive approval')
    ).to.be.revertedWith('Approved amount cannot exceed requested amount');
  });

  it('Should allow insurers to reject claims', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID123'
      );

    await expect(
      claimRequest
        .connect(insurer)
        .rejectClaim(1, 'Insufficient documentation provided')
    )
      .to.emit(claimRequest, 'ClaimProcessed')
      .withArgs(1, 2, 0, anyValue); // 2 = Rejected status

    const claim = await claimRequest.getClaim(1);
    expect(claim.status).to.equal(2); // Rejected
    expect(claim.approvedAmount).to.equal(0);
    expect(claim.notes).to.equal('Insufficient documentation provided');
  });

  it('Should prevent rejecting without a reason', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID123'
      );

    await expect(
      claimRequest.connect(insurer).rejectClaim(1, '')
    ).to.be.revertedWith('Rejection reason is required');
  });

  it('Should get claims by patient', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'First claim',
        'QmClaimCID1'
      );

    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId2,
        3000,
        'Consultation',
        'Second claim',
        'QmClaimCID2'
      );

    const patientClaimIds = await claimRequest.getClaimsByPatient(
      await patient.getAddress()
    );

    expect(patientClaimIds.length).to.equal(2);
    expect(patientClaimIds[0]).to.equal(1);
    expect(patientClaimIds[1]).to.equal(2);
  });

  it('Should get claims by insurer', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'First claim',
        'QmClaimCID1'
      );

    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId2,
        3000,
        'Consultation',
        'Second claim',
        'QmClaimCID2'
      );

    const insurerClaimIds = await claimRequest.getClaimsByInsurer(
      await insurer.getAddress()
    );

    expect(insurerClaimIds.length).to.equal(2);
    expect(insurerClaimIds[0]).to.equal(1);
    expect(insurerClaimIds[1]).to.equal(2);
  });

  it('Should get claims by medical record', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'First claim',
        'QmClaimCID1'
      );

    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        2000,
        'Follow-up',
        'Second claim for same record',
        'QmClaimCID2'
      );

    const recordClaimIds = await claimRequest
      .connect(patient)
      .getClaimsByMedicalRecord(await patient.getAddress(), recordId);

    expect(recordClaimIds.length).to.equal(2);
    expect(recordClaimIds[0]).to.equal(1);
    expect(recordClaimIds[1]).to.equal(2);
  });

  it('Should prevent unauthorized access to claims by medical record', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID1'
      );

    await expect(
      claimRequest
        .connect(doctor)
        .getClaimsByMedicalRecord(await patient.getAddress(), recordId)
    ).to.be.revertedWith('No access to view claims for this record');
  });

it('Should get correct insurer statistics', async function () {
    // Submit 3 claims
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Claim 1',
        'QmCID1'
      );

    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId2,
        3000,
        'Consultation',
        'Claim 2',
        'QmCID2'
      );

    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        2000,
        'Lab Test',
        'Claim 3',
        'QmCID3'
      );

    // Approve one
    await claimRequest.connect(insurer).approveClaim(1, 4500, 'Approved');

    // Reject one
    await claimRequest.connect(insurer).rejectClaim(2, 'Rejected');

    // Get statistics
    const stats = await claimRequest.getInsurerStatistics(
      await insurer.getAddress()
    );

    // Access struct properties
    expect(stats.totalClaims).to.equal(3);
    expect(stats.pendingClaims).to.equal(1);
    expect(stats.approvedClaims).to.equal(1);
    expect(stats.rejectedClaims).to.equal(1);
    expect(stats.totalRequestedAmount).to.equal(10000);
    expect(stats.totalApprovedAmount).to.equal(4500);
  });

  it('Should allow authorized insurers to get claim medical record', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID1'
      );

    const medicalRecord = await claimRequest
      .connect(insurer)
      .getClaimMedicalRecord(1);

    expect(medicalRecord.medicalRecordID).to.equal(recordId);
    expect(medicalRecord.patientAddress).to.equal(await patient.getAddress());
    expect(medicalRecord.cid).to.equal('QmHash123');
  });

  it('Should prevent unauthorized access to claim medical record', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Test claim',
        'QmClaimCID1'
      );

    await expect(
      claimRequest.connect(doctor).getClaimMedicalRecord(1)
    ).to.be.revertedWith('Only authorized insurer can access this claim');
  });

  it('Should get details for multiple claims', async function () {
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Claim 1',
        'QmCID1'
      );

    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId2,
        3000,
        'Consultation',
        'Claim 2',
        'QmCID2'
      );

    const claimIds = [1, 2];
    const claimDetails = await claimRequest.getClaimDetails(claimIds);

    expect(claimDetails.length).to.equal(2);
    expect(claimDetails[0].claimId).to.equal(1);
    expect(claimDetails[0].requestedAmount).to.equal(5000);
    expect(claimDetails[1].claimId).to.equal(2);
    expect(claimDetails[1].requestedAmount).to.equal(3000);
  });

  it('Should track multiple claims for same medical record', async function () {
    // Submit 3 claims for the same record
    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        5000,
        'Surgery',
        'Initial surgery',
        'QmCID1'
      );

    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        1000,
        'Follow-up',
        'Post-op checkup',
        'QmCID2'
      );

    await claimRequest
      .connect(patient)
      .submitClaim(
        await insurer.getAddress(),
        recordId,
        500,
        'Medication',
        'Prescribed medication',
        'QmCID3'
      );

    const recordClaimIds = await claimRequest
      .connect(patient)
      .getClaimsByMedicalRecord(await patient.getAddress(), recordId);

    expect(recordClaimIds.length).to.equal(3);
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
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress(), 'Dr. Doctor Name');

      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey,
          'Blood Test',
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
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress(), 'Dr. Doctor Name');

      // Add medical record
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey,
          'Blood Test',
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

    it('Should allow doctors to see the medical records they created', async function () {

      const recordCreated = await medicalRecords
        .connect(doctor)
        .getCreatedRecords(await doctor.getAddress())
 
      expect(recordCreated.length).to.equal(1);
      expect(recordCreated[0].medicalRecordID).to.equal(recordId);
      expect(recordCreated[0].patientAddress).to.equal(await patient.getAddress());
      expect(recordCreated[0].cid).to.equal('QmHash123');   
      expect(recordCreated[0].recordType).to.equal('Blood Test');
      expect(recordCreated[0].createdAt).to.be.greaterThan(0);
    });

    it('Should prevent non-doctors from calling getCreatedRecords function', async function(){
      await expect(
        medicalRecords
        .connect(patient)
        .getCreatedRecords(await patient.getAddress())
      ).to.be.revertedWith('Only doctor are allowed to get their own created records');
    })
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
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress(), 'Dr. Doctor Name');

      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await expect(
        medicalRecords
          .connect(doctor)
          .addMedicalRecord(
            await patient.getAddress(),
            recordId,
            'QmHash123',
            patientKey,
            'Blood Test',
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
          encryptedKey,
          '',
          'Dr. Doctor Name' // Add doctor name
        );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await doctor.getAddress(), 'Dr. Doctor Name');

      const recordId = 'LAB_001';
      const patientKey = ethers.toUtf8Bytes('aes-key-for-patient');
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'QmHash123',
          patientKey,
          'Blood Test',
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
        encryptedKey,
        '',
        ''
      );

      await roleUpgrade
        .connect(admin)
        .approveRequest(1, await patient.getAddress(),'');
      const adminList = await roleUpgrade.connect(patient).getAdmins();

      expect(adminList).to.include(await admin.getAddress());
      expect(adminList).to.include(await patient.getAddress());
      expect(adminList.length).to.equal(2);
    });
  });
});
