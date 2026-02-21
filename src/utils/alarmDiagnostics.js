/**
 * Alarm Diagnostics Utility
 *
 * Run this to diagnose alarm issues
 *
 * Usage:
 * import { runAlarmDiagnostics } from './utils/alarmDiagnostics';
 * await runAlarmDiagnostics(parentId);
 */

import notifee, { TriggerType, AndroidImportance } from '@notifee/react-native';
import alarmSchedulerService from '../services/AlarmSchedulerService';
import { Platform } from 'react-native';

export async function runAlarmDiagnostics(parentId) {
  console.log('=== ALARM DIAGNOSTICS START ===\n');

  const results = {
    timestamp: new Date().toISOString(),
    platform: `${Platform.OS} ${Platform.Version}`,
    checks: {},
    issues: [],
    recommendations: [],
  };

  // 1. Check notification permissions
  console.log('1. Checking notification permissions...');
  try {
    const settings = await notifee.getNotificationSettings();
    const authStatus = settings.authorizationStatus;
    const authStatusText =
      ['NOT_DETERMINED', 'DENIED', 'AUTHORIZED', 'PROVISIONAL'][authStatus] ||
      'UNKNOWN';

    results.checks.permissions = {
      status: authStatusText,
      authorized: authStatus === 2,
    };

    if (authStatus !== 2) {
      results.issues.push('Notification permissions not granted');
      results.recommendations.push(
        'Request notification permissions: await notifee.requestPermission()',
      );
    }

    console.log(`   ✓ Permission status: ${authStatusText}`);
  } catch (error) {
    results.checks.permissions = { error: error.message };
    results.issues.push(`Permission check failed: ${error.message}`);
    console.log(`   ✗ Error: ${error.message}`);
  }

  // 2. Check notification channels (Android only)
  if (Platform.OS === 'android') {
    console.log('\n2. Checking notification channels...');
    try {
      const channels = await notifee.getChannels();
      results.checks.channels = {
        count: channels.length,
        channels: channels.map(c => ({
          id: c.id,
          name: c.name,
          importance: c.importance,
        })),
      };

      const alarmChannel = channels.find(c => c.id === 'medicine-alarms');
      if (!alarmChannel) {
        results.issues.push('Medicine alarms channel not found');
        results.recommendations.push(
          'Notification channel may need to be recreated',
        );
      } else if (alarmChannel.importance < 4) {
        results.issues.push('Alarm channel importance too low');
        results.recommendations.push('Channel should have HIGH importance (4)');
      }

      console.log(`   ✓ Found ${channels.length} channels`);
      if (alarmChannel) {
        console.log(
          `   ✓ Medicine alarms channel exists (importance: ${alarmChannel.importance})`,
        );
      }
    } catch (error) {
      results.checks.channels = { error: error.message };
      console.log(`   ✗ Error: ${error.message}`);
    }
  }

  // 3. Check scheduled alarms
  console.log('\n3. Checking scheduled alarms...');
  try {
    const alarms = await alarmSchedulerService.getAllScheduledAlarms();
    const now = Date.now();
    const futureAlarms = alarms.filter(a => a.trigger.timestamp > now);
    const pastAlarms = alarms.filter(a => a.trigger.timestamp <= now);

    results.checks.alarms = {
      total: alarms.length,
      future: futureAlarms.length,
      past: pastAlarms.length,
    };

    if (alarms.length === 0) {
      results.issues.push('No alarms scheduled');
      results.recommendations.push('Schedule alarms for medicines');
    } else if (futureAlarms.length === 0) {
      results.issues.push('All alarms are in the past');
      results.recommendations.push(
        'Reschedule alarms: await alarmSchedulerService.manualRescheduleAll(parentId, true)',
      );
    }

    console.log(`   ✓ Total alarms: ${alarms.length}`);
    console.log(`   ✓ Future alarms: ${futureAlarms.length}`);
    console.log(`   ✓ Past alarms: ${pastAlarms.length}`);

    if (futureAlarms.length > 0) {
      const nextAlarm = futureAlarms.sort(
        (a, b) => a.trigger.timestamp - b.trigger.timestamp,
      )[0];
      const nextTime = new Date(nextAlarm.trigger.timestamp);
      const minutesUntil = Math.round(
        (nextAlarm.trigger.timestamp - now) / 60000,
      );

      results.checks.nextAlarm = {
        time: nextTime.toISOString(),
        minutesUntil,
        title: nextAlarm.notification.title,
      };

      console.log(
        `   ✓ Next alarm: ${nextTime.toLocaleString()} (in ${minutesUntil} minutes)`,
      );
      console.log(`   ✓ Medicine: ${nextAlarm.notification.title}`);
    }
  } catch (error) {
    results.checks.alarms = { error: error.message };
    results.issues.push(`Alarm check failed: ${error.message}`);
    console.log(`   ✗ Error: ${error.message}`);
  }

  // 4. Check alarm integrity
  if (parentId) {
    console.log('\n4. Checking alarm integrity...');
    try {
      const integrity = await alarmSchedulerService.verifyAlarmIntegrity(
        parentId,
      );
      results.checks.integrity = integrity;

      if (integrity.missingAlarms > 0) {
        results.issues.push(`${integrity.missingAlarms} alarms are missing`);
        results.recommendations.push(
          'Run verifyAndRestoreAlarms to fix missing alarms',
        );
      }

      console.log(`   ✓ Total medicines: ${integrity.totalMedicines}`);
      console.log(`   ✓ Active medicines: ${integrity.activeMedicines}`);
      console.log(`   ✓ Expected alarms: ${integrity.expectedAlarms}`);
      console.log(`   ✓ Actual alarms: ${integrity.actualAlarms}`);
      console.log(`   ✓ Missing alarms: ${integrity.missingAlarms}`);

      if (integrity.issues && integrity.issues.length > 0) {
        console.log('   ⚠ Issues found:');
        integrity.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      }
    } catch (error) {
      results.checks.integrity = { error: error.message };
      console.log(`   ✗ Error: ${error.message}`);
    }
  }

  // 5. Check recent logs
  console.log('\n5. Checking recent alarm logs...');
  try {
    const logs = alarmSchedulerService.getLogs({ limit: 10 });
    results.checks.recentLogs = logs;

    const errorLogs = logs.filter(l => l.level === 'error');
    const warnLogs = logs.filter(l => l.level === 'warn');

    console.log(`   ✓ Recent logs: ${logs.length}`);
    console.log(`   ✓ Errors: ${errorLogs.length}`);
    console.log(`   ✓ Warnings: ${warnLogs.length}`);

    if (errorLogs.length > 0) {
      console.log('   ⚠ Recent errors:');
      errorLogs.slice(0, 3).forEach(log => {
        console.log(
          `     - ${log.operation}: ${
            log.details.error || log.details.message
          }`,
        );
      });
    }
  } catch (error) {
    results.checks.recentLogs = { error: error.message };
    console.log(`   ✗ Error: ${error.message}`);
  }

  // 6. Battery optimization check (Android only)
  if (Platform.OS === 'android') {
    console.log('\n6. Checking battery optimization...');
    try {
      const powerManager = await notifee.getPowerManagerInfo();
      results.checks.batteryOptimization = {
        activity: powerManager.activity,
        manufacturer: powerManager.manufacturer,
      };

      if (powerManager.activity) {
        results.issues.push('Battery optimization may be enabled');
        results.recommendations.push('Request battery optimization exemption');
      }

      console.log(`   ✓ Manufacturer: ${powerManager.manufacturer}`);
      console.log(`   ✓ Activity: ${powerManager.activity}`);
    } catch (error) {
      results.checks.batteryOptimization = { error: error.message };
      console.log(`   ⚠ Could not check battery optimization`);
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Issues found: ${results.issues.length}`);
  if (results.issues.length > 0) {
    console.log('\nIssues:');
    results.issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }

  if (results.recommendations.length > 0) {
    console.log('\nRecommendations:');
    results.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  if (results.issues.length === 0) {
    console.log('✓ No issues found! Alarms should be working correctly.');
  }

  console.log('\n=== ALARM DIAGNOSTICS END ===\n');

  return results;
}

/**
 * Create a test alarm for immediate testing
 */
export async function createTestAlarm(minutesFromNow = 1) {
  console.log(
    `Creating test alarm for ${minutesFromNow} minute(s) from now...`,
  );

  const testTime = new Date(Date.now() + minutesFromNow * 60000);

  try {
    await notifee.createTriggerNotification(
      {
        id: 'test-alarm-' + Date.now(),
        title: '🔔 Test Alarm',
        body: `This is a test alarm scheduled for ${testTime.toLocaleTimeString()}`,
        android: {
          channelId: 'medicine-alarms',
          importance: AndroidImportance.HIGH,
          category: 'alarm',
          autoCancel: false, // Don't dismiss automatically
          ongoing: true, // Make it persistent
          sound: 'default',
          loopSound: true, // Loop the sound like an alarm
          vibrationPattern: [500, 500, 500, 500], // Continuous vibration (even number of values)
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          fullScreenAction: {
            id: 'full_screen_alarm',
            launchActivity: 'default',
          },
          actions: [
            {
              title: 'Dismiss',
              pressAction: {
                id: 'dismiss',
              },
            },
          ],
        },
        ios: {
          sound: 'default',
          critical: true,
          criticalVolume: 1.0,
          interruptionLevel: 'timeSensitive',
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: testTime.getTime(),
      },
    );

    console.log(`✓ Test alarm created for: ${testTime.toLocaleString()}`);
    console.log(`  Wait ${minutesFromNow} minute(s) to see if it triggers.`);
    console.log('  If this works, your alarm system is functioning correctly.');

    return testTime;
  } catch (error) {
    console.error('✗ Failed to create test alarm:', error.message);
    throw error;
  }
}

/**
 * Quick fix - reschedule all alarms
 */
export async function quickFixAlarms(parentId) {
  console.log('Running quick fix for alarms...\n');

  try {
    // 1. Request permissions
    console.log('1. Requesting permissions...');
    const settings = await notifee.requestPermission();
    console.log(
      `   ✓ Permission: ${
        settings.authorizationStatus === 2 ? 'Granted' : 'Denied'
      }`,
    );

    // 2. Reschedule all alarms
    console.log('\n2. Rescheduling all alarms...');
    const result = await alarmSchedulerService.manualRescheduleAll(
      parentId,
      true,
    );
    console.log(
      `   ✓ Rescheduled ${result.totalAlarms} alarms for ${result.medicinesProcessed} medicines`,
    );

    // 3. Verify
    console.log('\n3. Verifying alarms...');
    const alarms = await alarmSchedulerService.getAllScheduledAlarms();
    const futureAlarms = alarms.filter(a => a.trigger.timestamp > Date.now());
    console.log(`   ✓ ${futureAlarms.length} future alarms scheduled`);

    if (futureAlarms.length > 0) {
      const nextAlarm = futureAlarms.sort(
        (a, b) => a.trigger.timestamp - b.trigger.timestamp,
      )[0];
      const nextTime = new Date(nextAlarm.trigger.timestamp);
      console.log(`   ✓ Next alarm: ${nextTime.toLocaleString()}`);
    }

    console.log('\n✓ Quick fix complete!');
    return { success: true, alarmsScheduled: futureAlarms.length };
  } catch (error) {
    console.error('\n✗ Quick fix failed:', error.message);
    throw error;
  }
}
