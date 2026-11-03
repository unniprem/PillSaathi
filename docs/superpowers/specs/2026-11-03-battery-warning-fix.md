# Battery warning after allowing background activity

The user reported the warning on Nothing and Redmi. The supplied photo,
`PHOTO-2026-11-01-21-47-25.jpg`, shows only the battery optimization issue.
`HealthChecker` reads `PowerManager.isIgnoringBatteryOptimizations`, while the
old settings action opened the general battery optimization list. Allowing
background activity does not establish that this exemption has been granted.
No test phone was connected during this investigation.

## Change

For `batteryOptimization`, try Android's package-specific
`ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` prompt first. Declare its required
`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` permission. If the prompt is unavailable
or blocked by the ROM, retain the battery optimization list and existing App
info fallback. Update the setup instructions in English, Hindi and Malayalam
to cover both routes.

Keep the real health check, the existing refresh after returning to the app,
and the separate OEM setup steps. Opening or declining the prompt must not
mark the battery setup complete or hide the warning.

This revises the original decision to use only the settings list. Android's
[Doze guidance](https://developer.android.com/training/monitoring-device-state/doze-standby#support_for_other_use_cases)
lists safety apps that keep users and families safe as an acceptable exemption
use case. PillSaathi's medication reminders and family missed-dose alerts fit
that purpose; this is the rationale for choosing the direct request. The
[Settings API](https://developer.android.com/reference/android/provider/Settings#ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
documents the package URI and permission used here.

## Verification

Five Robolectric regression tests first failed against the original launcher:
the package-specific prompt, required manifest permission, missing and blocked
prompt fallbacks, and final App info fallback. All passed after the fix.
Today tests cover Nothing and Xiaomi manufacturer values, keeping the warning
when only background activity is allowed and removing it after a refreshed
health result reports exemption. These mock the native health results; physical
Nothing and Redmi retesting remains required.
