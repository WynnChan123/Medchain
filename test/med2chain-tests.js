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
      await healthcareSystem.connect(patient).registerUser(
        await patient.getAddress(),
        patientHashedId,
        1
      );

      const patientUser = await userManagement.users(await patient.getAddress());
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
      await roleUpgrade.connect(admin).approveRequest(1, await patient.getAddress());

      expect(await userManagement.userExists(await patient.getAddress())).to.be.true;
      expect(await userManagement.getUserRole(await patient.getAddress())).to.equal(2);
    });
  });

  describe('MedicalRecordsManagement', function () {
    beforeEach(async function () {
      // Register patient first
      await healthcareSystem.connect(patient).registerUser(
        await patient.getAddress(),
        patientHashedId,
        1
      );

      // Register doctor as patient first, then upgrade to HealthcareProvider
      await healthcareSystem.connect(doctor).registerUser(
        await doctor.getAddress(),
        doctorHashedId,
        1
      );

      // Upgrade doctor to HealthcareProvider role
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];
      
      await roleUpgrade.connect(doctor).submitUpgradeRequest(
        await doctor.getAddress(),
        'QmDoctorCID',
        2,
        admins,
        encryptedKey
      );

      await roleUpgrade.connect(admin).approveRequest(1, await doctor.getAddress());
    });

    it('Should allow doctors to add medical records', async function () {
      const recordId = 'LAB_001';

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'John Doe',
          '1990-01-01',
          'Male',
          '123-456-7890',
          '123 Main St',
          'Blood test results normal',
          'Laboratory',
          'QmHash123'
        );

      const record = await medicalRecords.patientMedicalRecord(
        await patient.getAddress(),
        recordId
      );
      expect(record.medicalRecordID).to.equal(recordId);
      expect(record.patientName).to.equal('John Doe');
      expect(record.recordType).to.equal('Laboratory');
    });

    it('Should prevent non-doctors from adding medical records', async function () {
      const recordId = 'LAB_001';

      await expect(
        medicalRecords
          .connect(patient)
          .addMedicalRecord(
            await patient.getAddress(),
            recordId,
            'John Doe',
            '1990-01-01',
            'Male',
            '123-456-7890',
            '123 Main St',
            'Blood test results',
            'Laboratory',
            'QmHash123'
          )
      ).to.be.revertedWith('Only doctors can add records');
    });

    it('Should prevent duplicate record IDs', async function () {
      const recordId = 'LAB_001';

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'John Doe',
          '1990-01-01',
          'Male',
          '123-456-7890',
          '123 Main St',
          'Blood test results',
          'Laboratory',
          'QmHash123'
        );

      await expect(
        medicalRecords
          .connect(doctor)
          .addMedicalRecord(
            await patient.getAddress(),
            recordId,
            'Jane Doe',
            '1992-01-01',
            'Female',
            '123-456-7891',
            '124 Main St',
            'X-ray results',
            'Radiology',
            'QmHash124'
          )
      ).to.be.revertedWith('Record already exists');
    });

    it('Should generate consistent record hash', async function () {
      const recordId = 'LAB_001';

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'John Doe',
          '1990-01-01',
          'Male',
          '123-456-7890',
          '123 Main St',
          'Blood test results',
          'Laboratory',
          'QmHash123'
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
      
      await roleUpgrade.connect(doctor).submitUpgradeRequest(
        await doctor.getAddress(),
        'QmDoctorCID',
        2,
        admins,
        encryptedKey
      );

      await roleUpgrade.connect(admin).approveRequest(1, await doctor.getAddress());

      // Add medical record
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'John Doe',
          '1990-01-01',
          'Male',
          '123-456-7890',
          '123 Main St',
          'Blood test results',
          'Laboratory',
          'QmHash123'
        );
    });

    it('Should allow patients to grant access', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await doctor.getAddress(), recordId);

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
          .grantAccess(await doctor.getAddress(), recordId)
      ).to.be.revertedWith(
        'Only patients are allowed to grant access to third parties'
      );
    });

    it('Should prevent granting access to non-existent records', async function () {
      await expect(
        accessControl
          .connect(patient)
          .grantAccess(await doctor.getAddress(), 'NON_EXISTENT')
      ).to.be.revertedWith('Patient record does not exist');
    });

    it('Should allow patients to revoke access', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await doctor.getAddress(), recordId);

      await accessControl
        .connect(patient)
        .revokeAccess(await doctor.getAddress(), recordId);

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
        .grantAccess(await doctor.getAddress(), recordId);

      const grantedPeople = await accessControl
        .connect(patient)
        .checkWhoHasAccess(recordId);
      expect(grantedPeople).to.include(await doctor.getAddress());
    });

    it('Should prevent duplicate access grants', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await doctor.getAddress(), recordId);

      await expect(
        accessControl
          .connect(patient)
          .grantAccess(await doctor.getAddress(), recordId)
      ).to.be.revertedWith('Access already granted');
    });
  });

  describe('RoleUpgrade', function () {
    const cid = 'Qm123abcCIDExample';
    const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];

    beforeEach(async function () {
      await healthcareSystem.connect(patient).registerUser(
        await patient.getAddress(),
        patientHashedId,
        1
      );
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

      await roleUpgrade.connect(patient).submitUpgradeRequest(
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

      await roleUpgrade.connect(patient).submitUpgradeRequest(
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
        roleUpgrade.connect(patient).submitUpgradeRequest(
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
      
      await roleUpgrade.connect(doctor).submitUpgradeRequest(
        await doctor.getAddress(),
        'QmDoctorCID',
        2,
        admins,
        encryptedKey
      );

      await roleUpgrade.connect(admin).approveRequest(1, await doctor.getAddress());

      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'John Doe',
          '1990-01-01',
          'Male',
          '123-456-7890',
          '123 Main St',
          'Blood test results normal',
          'Laboratory',
          'QmHash123'
        );
    });

    it('Should allow authorized updates to medical records', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await doctor.getAddress(), recordId);

      await medicalRecords
        .connect(doctor)
        .updateRecord(
          await patient.getAddress(),
          recordId,
          'Updated blood test results - cholesterol high',
          'Follow-up required',
          'medicalHistory',
          await accessControl.getAddress()
        );

      const updatedRecord = await medicalRecords.patientMedicalRecord(
        await patient.getAddress(),
        recordId
      );
      expect(updatedRecord.medicalHistory).to.equal(
        'Updated blood test results - cholesterol high'
      );
    });

    it('Should prevent unauthorized updates', async function () {
      await expect(
        medicalRecords
          .connect(doctor)
          .updateRecord(
            await patient.getAddress(),
            recordId,
            'Unauthorized update',
            'Hacking attempt',
            'medicalHistory',
            await accessControl.getAddress()
          )
      ).to.be.revertedWith('No access to this record');
    });

    it('Should maintain update history', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(await doctor.getAddress(), recordId);

      await medicalRecords
        .connect(doctor)
        .updateRecord(
          await patient.getAddress(),
          recordId,
          'Updated results',
          'Routine update',
          'medicalHistory',
          await accessControl.getAddress()
        );

      const history = await medicalRecords
        .connect(patient)
        .getRecordHistory(
          await patient.getAddress(),
          recordId,
          await accessControl.getAddress()
        );

      expect(history.length).to.equal(1);
      expect(history[0].fieldUpdated).to.equal('medicalHistory');
      expect(history[0].updatedBy).to.equal(await doctor.getAddress());
      expect(history[0].updateReason).to.equal('Routine update');
    });

    it('Should allow patients to view their own record history', async function () {
      await accessControl
        .connect(patient)
        .grantAccess(doctor.getAddress(), recordId);

      await medicalRecords
        .connect(doctor)
        .updateRecord(
          await patient.getAddress(),
          recordId,
          'Updated',
          'Test update',
          'medicalHistory',
          await accessControl.getAddress()
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

  describe('Edge Cases and Security', function () {
    it('Should handle empty record ID', async function () {
      const recordId = '';
      await healthcareSystem      //the patient that the new doctor will add record for
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await healthcareSystem
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Upgrade patient to HealthcareProvider
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];
      
      await roleUpgrade.connect(doctor).submitUpgradeRequest(
        await doctor.getAddress(),
        'QmDoctorCID',
        2,
        admins,
        encryptedKey
      );

      await roleUpgrade.connect(admin).approveRequest(1, await doctor.getAddress());

      await expect(
        medicalRecords
          .connect(doctor)
          .addMedicalRecord(
            await patient.getAddress(),
            recordId,
            'John Doe',
            '1990-01-01',
            'Male',
            '123-456-7890',
            '123 Main St',
            'Blood test',
            'Laboratory',
            'QmHash123'
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
      
      await healthcareSystem    //register patient as doctor first
        .connect(doctor)
        .registerUser(await doctor.getAddress(), doctorHashedId, 1);

      // Upgrade doctor to HealthcareProvider
      const admins = [await admin.getAddress()];
      const encryptedKey = [ethers.toUtf8Bytes('EncryptedKeyExample')];
      
      await roleUpgrade.connect(doctor).submitUpgradeRequest(
        await doctor.getAddress(),
        'QmDoctorCID',
        2,
        admins,
        encryptedKey
      );

      await roleUpgrade.connect(admin).approveRequest(1, await doctor.getAddress());

      const recordId = 'LAB_001';
      await medicalRecords
        .connect(doctor)
        .addMedicalRecord(
          await patient.getAddress(),
          recordId,
          'John Doe',
          '1990-01-01',
          'Male',
          '123-456-7890',
          '123 Main St',
          'Blood test',
          'Laboratory',
          'QmHash123'
        );

      await accessControl
        .connect(patient)
        .grantAccess(await doctor.getAddress(), recordId);

      await expect(
        medicalRecords
          .connect(doctor)
          .updateRecord(
            await patient.getAddress(),
            recordId,
            'Hacked',
            'Evil update',
            'patientName',
            await accessControl.getAddress()
          )
      ).to.be.revertedWith('Field cannot be updated');
    });
  });
});