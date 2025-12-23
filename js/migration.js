/**
 * Migration Utility Module
 *
 * Purpose: Handle MV2 → MV3 data migration with zero data loss
 * Constitution Principle II: User Data is Sacred
 *
 * Created: 2025-12-22
 * MV3 Migration: Redirector v4.0.0
 */

// CODE ARCHAEOLOGY: MV3 Migration - New file
// Reason: Centralize migration logic, automatic backup, rollback capability
// Constitution compliance: Principle II (User Data is Sacred), Principle VI (Risk Assessment)

/**
 * Check if migration has already been completed
 * @returns {Promise<boolean>} True if migration done, false otherwise
 */
async function checkMigrationDone() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['migrationState'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking migration state:', chrome.runtime.lastError);
        resolve(false);
        return;
      }

      const migrationState = result.migrationState;
      const isDone = migrationState && migrationState.status === 'complete';

      if (isDone) {
        console.log('Migration already completed:', migrationState);
      }

      resolve(isDone);
    });
  });
}

/**
 * Create automatic backup of MV2 data before migration
 * @returns {Promise<Object>} Backup metadata
 */
async function createBackup() {
  return new Promise((resolve, reject) => {
    // Get all current storage data
    chrome.storage.local.get(null, (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error('Failed to read storage for backup: ' + chrome.runtime.lastError.message));
        return;
      }

      const timestamp = Date.now();
      const backupKey = `mv2_backup_${timestamp}`;

      // Backup critical data
      const backup = {
        redirects: data.redirects || [],
        disabled: data.disabled || false,
        logging: data.logging || false,
        enableNotifications: data.enableNotifications || false,
        isSyncEnabled: data.isSyncEnabled || false,
        timestamp: timestamp,
        version: '3.5.4' // MV2 version
      };

      // Save backup
      chrome.storage.local.set({ [backupKey]: backup }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error('Failed to save backup: ' + chrome.runtime.lastError.message));
          return;
        }

        console.log('MV2 data backed up successfully:', backupKey);
        console.log('Backup contains', backup.redirects.length, 'redirect rules');

        resolve({
          backupKey: backupKey,
          timestamp: timestamp,
          redirectsCount: backup.redirects.length
        });
      });
    });
  });
}

/**
 * Validate redirect rules for corruption or malformed data
 * @param {Array} redirects - Array of redirect rule objects
 * @returns {Object} Validation result {valid: Array, invalid: Array, errors: Array}
 */
function validateRedirects(redirects) {
  if (!Array.isArray(redirects)) {
    return {
      valid: [],
      invalid: [],
      errors: ['Redirects is not an array']
    };
  }

  const valid = [];
  const invalid = [];
  const errors = [];

  redirects.forEach((rule, index) => {
    // Check if rule is an object
    if (typeof rule !== 'object' || rule === null) {
      invalid.push({ index, rule, reason: 'Not an object' });
      errors.push(`Rule ${index}: Not a valid object`);
      return;
    }

    // Check required fields
    const requiredFields = ['includePattern', 'redirectUrl'];
    const missingFields = requiredFields.filter(field => !rule[field]);

    if (missingFields.length > 0) {
      invalid.push({ index, rule, reason: `Missing required fields: ${missingFields.join(', ')}` });
      errors.push(`Rule ${index}: Missing ${missingFields.join(', ')}`);
      return;
    }

    // Rule is valid
    valid.push(rule);
  });

  return { valid, invalid, errors };
}

/**
 * Run migration from MV2 to MV3
 * @returns {Promise<Object>} Migration result
 */
async function runMigration() {
  console.log('Starting MV2 → MV3 migration...');

  try {
    // Step 1: Check if already migrated
    const alreadyMigrated = await checkMigrationDone();
    if (alreadyMigrated) {
      console.log('Migration already completed, skipping');
      return { status: 'already_complete' };
    }

    // Step 2: Create backup
    console.log('Creating automatic backup...');
    const backupInfo = await createBackup();

    // Step 3: Get current data
    const data = await new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Failed to read storage: ' + chrome.runtime.lastError.message));
          return;
        }
        resolve(result);
      });
    });

    // Step 4: Validate redirects
    const redirects = data.redirects || [];
    const validation = validateRedirects(redirects);

    if (validation.errors.length > 0) {
      console.warn('Data validation found issues:', validation.errors);
      console.log('Valid rules:', validation.valid.length);
      console.log('Invalid rules:', validation.invalid.length);
    }

    // Step 5: Save migration state (use valid rules only)
    const migrationState = {
      version: '4.0.0-beta.1',
      migratedFrom: '3.5.4',
      timestamp: Date.now(),
      redirectsCount: validation.valid.length,
      invalidRulesCount: validation.invalid.length,
      backupKey: backupInfo.backupKey,
      status: 'complete',
      errors: validation.errors
    };

    // Save cleaned data (if there were invalid rules)
    const updateData = {
      migrationState: migrationState
    };

    if (validation.invalid.length > 0) {
      // Replace redirects with valid ones only
      updateData.redirects = validation.valid;
      console.warn('Removed', validation.invalid.length, 'invalid rules');
    }

    await new Promise((resolve, reject) => {
      chrome.storage.local.set(updateData, () => {
        if (chrome.runtime.lastError) {
          reject(new Error('Failed to save migration state: ' + chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });

    console.log('Migration completed successfully');
    console.log('Backup key:', backupInfo.backupKey);
    console.log('Migrated redirects:', validation.valid.length);

    if (validation.errors.length > 0) {
      // Notify user of data issues
      if (typeof chrome.notifications !== 'undefined') {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon-light-theme-48.png',
          title: 'Redirector Migration Complete',
          message: `Migrated ${validation.valid.length} rules. ${validation.invalid.length} invalid rules removed. Backup created.`
        });
      }
    }

    return {
      status: 'success',
      backupKey: backupInfo.backupKey,
      redirectsCount: validation.valid.length,
      invalidRulesCount: validation.invalid.length,
      errors: validation.errors
    };

  } catch (error) {
    console.error('Migration failed:', error);

    // Save failed migration state
    const failedState = {
      version: '4.0.0-beta.1',
      timestamp: Date.now(),
      status: 'failed',
      error: error.message
    };

    await new Promise((resolve) => {
      chrome.storage.local.set({ migrationState: failedState }, () => {
        resolve();
      });
    });

    throw error;
  }
}

/**
 * Rollback migration by restoring from automatic backup
 * @param {string} backupKey - Optional specific backup key, otherwise uses latest
 * @returns {Promise<Object>} Rollback result
 */
async function rollbackMigration(backupKey) {
  console.log('Starting migration rollback...');

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error('Failed to read storage: ' + chrome.runtime.lastError.message));
        return;
      }

      // Find backup
      let backup;
      let foundBackupKey;

      if (backupKey) {
        backup = data[backupKey];
        foundBackupKey = backupKey;
      } else {
        // Find latest backup
        const backupKeys = Object.keys(data).filter(k => k.startsWith('mv2_backup_'));
        if (backupKeys.length === 0) {
          reject(new Error('No automatic backup found'));
          return;
        }

        // Sort by timestamp (latest first)
        backupKeys.sort((a, b) => {
          const tsA = parseInt(a.split('_')[2]);
          const tsB = parseInt(b.split('_')[2]);
          return tsB - tsA;
        });

        foundBackupKey = backupKeys[0];
        backup = data[foundBackupKey];
      }

      if (!backup) {
        reject(new Error('Backup not found: ' + (backupKey || 'latest')));
        return;
      }

      console.log('Restoring from backup:', foundBackupKey);
      console.log('Backup contains', backup.redirects.length, 'redirect rules');

      // Restore data
      const restoreData = {
        redirects: backup.redirects,
        disabled: backup.disabled,
        logging: backup.logging,
        enableNotifications: backup.enableNotifications,
        isSyncEnabled: backup.isSyncEnabled
      };

      // Clear migration state (mark as rolled back)
      chrome.storage.local.remove(['migrationState'], () => {
        chrome.storage.local.set(restoreData, () => {
          if (chrome.runtime.lastError) {
            reject(new Error('Failed to restore backup: ' + chrome.runtime.lastError.message));
            return;
          }

          console.log('Rollback completed successfully');
          console.log('Restored', backup.redirects.length, 'redirect rules');

          resolve({
            status: 'success',
            backupKey: foundBackupKey,
            redirectsCount: backup.redirects.length
          });
        });
      });
    });
  });
}

// Export functions (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkMigrationDone,
    createBackup,
    validateRedirects,
    runMigration,
    rollbackMigration
  };
}
