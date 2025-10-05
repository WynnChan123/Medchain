const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Healthcare System Contracts', function () {
  let userManagement;
  let medicalRecords;
  let accessControl;
  let healthcareSystem;
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
    // Get signers
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

      const HealthcareSystem = await ethers.getContractFactory('HealthcareSystem');
      healthcareSystem = await HealthcareSystem.deploy(
        await userManagement.getAddress(),
        await medicalRecords.getAddress(),
        await accessControl.getAddress()
      );
      await healthcareSystem.waitForDeployment();
  });

  describe('UserManagement', function () {
    it('Should set admin correctly on deployment', async function () {
      expect(await userManagement.admin()).to.equal(await admin.getAddress());
      const adminUser = await userManagement.users(await admin.getAddress());
      expect(adminUser.role).to.equal(4); // Admin role
      expect(adminUser.isActive).to.be.true;
    });

    it('Should allow patient self-registration', async function () {
      await healthcareSystem.connect(patient).registerUser(
        await patient.getAddress(),
        patientHashedId,
        1 // Patient role
      );

      const patientUser = await userManagement.users(
        await patient.getAddress()
      );
      expect(patientUser.role).to.equal(1); // Patient role
      expect(patientUser.isActive).to.be.true;
      expect(patientUser.authorizedBy).to.equal(await patient.getAddress());
    });

    it('Should allow admin to register healthcare providers', async function () {
      await healthcareSystem.connect(admin).registerUser(
        await doctor.getAddress(),
        doctorHashedId,
        2 // HealthcareProvider role
      );

      const doctorUser = await userManagement.users(await doctor.getAddress());
      expect(doctorUser.role).to.equal(2); // HealthcareProvider role
      expect(doctorUser.authorizedBy).to.equal(await admin.getAddress());
    });

    it('Should prevent non-admin from registering healthcare providers', async function () {
      await expect(
        healthcareSystem.connect(patient).registerUser(
          await doctor.getAddress(),
          doctorHashedId,
          2 // HealthcareProvider role
        )
      ).to.be.revertedWith('Only admin can register users');
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

    it('Should allow admin to update roles', async function () {
      // Register patient first
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      // Admin updates role
      await userManagement
        .connect(admin)
        .updateRoles(await patient.getAddress(), 3); // Insurer role

      const updatedUser = await userManagement.users(
        await patient.getAddress()
      );
      expect(updatedUser.role).to.equal(3); // Insurer role
    });

    it('Should correctly identify existing users', async function () {
      // Check that admin exists (deployed with contract)
      expect(await userManagement.userExists(await admin.getAddress())).to.be.true;

      // Check that unregistered user doesn't exist
      expect(await userManagement.userExists(await patient.getAddress())).to.be.false;

      // Register patient
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      // Check that patient now exists
      expect(await userManagement.userExists(await patient.getAddress())).to.be.true;
    });

    it('Should return false for zero address', async function () {
      expect(await userManagement.userExists('0x0000000000000000000000000000000000000000')).to.be.false;
    });

    it('Should work correctly with getUserRole for non-existent users', async function () {
      // For non-existent users, getUserRole should return Unregistered (0) due to Solidity defaults
      // But userExists should return false
      const nonExistentUser = await doctor.getAddress();

      expect(await userManagement.userExists(nonExistentUser)).to.be.false;
      expect(await userManagement.getUserRole(nonExistentUser)).to.equal(0); // Unregistered role (default)

      // After registration, both should work correctly
      await healthcareSystem.connect(admin).registerUser(nonExistentUser, doctorHashedId, 2);

      expect(await userManagement.userExists(nonExistentUser)).to.be.true;
      expect(await userManagement.getUserRole(nonExistentUser)).to.equal(2); // HealthcareProvider role
    });
  });

  describe('MedicalRecordsManagement', function () {
    beforeEach(async function () {
      // Register patient first
      await healthcareSystem.connect(patient).registerUser(
        await patient.getAddress(),
        patientHashedId,
        1 // Patient role
      );

      // Register doctor
      await healthcareSystem.connect(admin).registerUser(
        await doctor.getAddress(),
        doctorHashedId,
        2 // HealthcareProvider role
      );
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
      await healthcareSystem.connect(patient).registerUser(await patient.getAddress(),patientHashedId,1);
      // await userManagement.connect(patient).registerUser(await patient.getAddress(), patientHashedId, 1);
      await healthcareSystem.connect(admin).registerUser(await doctor.getAddress(), doctorHashedId, 2);


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
      // Grant access first
      await accessControl
        .connect(patient)
        .grantAccess(await doctor.getAddress(), recordId);

      // Revoke access
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

      const grantedPeople = await accessControl.connect(patient).checkWhoHasAccess(recordId);
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

  describe('Integration Tests', function () {
    const recordId = 'LAB_001';

    beforeEach(async function () {
      // Setup complete system
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);
      await healthcareSystem
        .connect(admin)
        .registerUser(await doctor.getAddress(), doctorHashedId, 2);

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
      // Grant access to doctor
      await accessControl
        .connect(patient)
        .grantAccess(await doctor.getAddress(), recordId);

      // Doctor updates record
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
      // Don't grant access to doctor
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

      const history = await medicalRecords.connect(patient).getRecordHistory(
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
      await healthcareSystem
        .connect(patient)
        .registerUser(await patient.getAddress(), patientHashedId, 1);

      await healthcareSystem
        .connect(admin)
        .registerUser(await doctor.getAddress(), doctorHashedId, 2);

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
      await healthcareSystem
        .connect(admin)
        .registerUser(await doctor.getAddress(), doctorHashedId, 2);

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
