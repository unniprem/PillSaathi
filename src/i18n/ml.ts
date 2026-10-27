// DRAFT: Malayalam drafted by the implementer, not yet checked by a Malayalam reader. It stays
// hidden in release builds (LanguageRules.CHECKED on the native side) until someone who reads
// Malayalam checks it, starting with the amounts and the ringing screen. Names of settings on the
// phone stay in English, as most phones show them.
import type { Strings } from './en';

export const ml: Strings = {
  days: ['ഞായർ', 'തിങ്കൾ', 'ചൊവ്വ', 'ബുധൻ', 'വ്യാഴം', 'വെള്ളി', 'ശനി'],
  months: [
    'ജനു',
    'ഫെബ്രു',
    'മാർ',
    'ഏപ്രി',
    'മേയ്',
    'ജൂൺ',
    'ജൂലൈ',
    'ഓഗ',
    'സെപ്',
    'ഒക്ടോ',
    'നവം',
    'ഡിസം',
  ],
  forms: {
    tablet: 'ഗുളിക',
    capsule: 'ക്യാപ്സ്യൂൾ',
    syrup: 'സിറപ്പ്',
    drops: 'തുള്ളിമരുന്ന്',
  },
  common: {
    cancel: 'റദ്ദാക്കുക',
    // Short: Delete and Save share the pill page's top bar with its title.
    delete: 'നീക്കുക',
    save: 'സേവ്',
    ok: 'ശരി',
    tryAgain: 'വീണ്ടും ശ്രമിക്കുക.',
    openSettings: 'ക്രമീകരണങ്ങൾ തുറക്കുക',
    defaultTone: 'സാധാരണ അലാറം ശബ്ദം',
  },
  today: {
    title: 'ഇന്ന്',
    titleOn: (day: string) => `ഇന്ന് · ${day}`,
    addPill: '+ മരുന്ന് ചേർക്കുക',
    empty:
      'ഇതുവരെ മരുന്നുകളൊന്നുമില്ല. ചേർക്കാൻ + മരുന്ന് ചേർക്കുക അമർത്തുക.',
    loadFailed:
      'മരുന്നുകൾ ലോഡ് ചെയ്യാനായില്ല. ആപ്പ് വീണ്ടും തുറന്ന് ശ്രമിക്കുക.',
    missedTitle: 'കഴിക്കാതെ പോയ മരുന്നുകൾ',
    missedBody: (lines: string) =>
      `ഫോൺ PillSaathi നിർത്തിയതിനാൽ ഇവ നഷ്ടമായി:\n${lines}`,
    later: 'പിന്നീട്',
    fixThis: 'ശരിയാക്കുക',
    markTakenTitle: 'കഴിച്ചതായി രേഖപ്പെടുത്തണോ?',
    markTaken: 'കഴിച്ചതായി രേഖപ്പെടുത്തുക',
    markFailed: 'കഴിച്ചതായി രേഖപ്പെടുത്താനായില്ല',
    notificationsTitle: 'അറിയിപ്പുകൾ അനുവദിക്കുക',
    notificationsMessage:
      'മരുന്നിന്റെ സമയമാകുമ്പോൾ കാണിക്കാൻ PillSaathi-ക്ക് അറിയിപ്പുകൾ വേണം.',
  },
  status: {
    taken: '✓ കഴിച്ചു',
    takenAt: (time: string) => `✓ കഴിച്ചു ${time}`,
    skipped: 'ഒഴിവാക്കി',
    missed: 'നഷ്ടമായി',
    ringing: 'ഇപ്പോൾ മുഴങ്ങുന്നു',
    snoozed: 'സ്നൂസ് ചെയ്തു',
    snoozedUntil: (time: string) => `${time} വരെ സ്നൂസ്`,
    upcoming: 'വരാനിരിക്കുന്നു',
    nextTomorrow: 'അടുത്തത്: നാളെ',
    nextOn: (day: string) => `അടുത്തത്: ${day}`,
  },
  course: {
    fromTomorrow: 'നാളെ മുതൽ',
    startsTomorrow: 'നാളെ തുടങ്ങും',
    startsOn: (day: string) => `${day} തുടങ്ങും`,
    lastDay: 'അവസാന ദിവസം',
    dayOf: (day: number, days: number) => `${days}-ൽ ${day}-ാം ദിവസം`,
    summaryStartsToday: 'ഇന്ന് തുടങ്ങുന്നു',
    summaryStartsTomorrow: 'നാളെ തുടങ്ങുന്നു',
    summaryStarted: (day: string) => `${day} തുടങ്ങി`,
    summaryStartsOn: (day: string) => `${day} തുടങ്ങുന്നു`,
    summaryNoEnd: (start: string) => `${start} · അവസാന തീയതിയില്ല`,
    summaryLastDose: (start: string, last: string) =>
      `${start} · അവസാന ഡോസ് ${last}`,
  },
  pill: {
    addTitle: 'മരുന്ന് ചേർക്കുക',
    editTitle: 'മരുന്ന് മാറ്റുക',
    name: 'പേര്',
    namePlaceholder: 'മരുന്നിന്റെ പേര്',
    loadFailed: 'ഈ മരുന്ന് ലോഡ് ചെയ്യാനായില്ല.',
    photo: 'ഫോട്ടോ',
    takePhoto: 'ഫോട്ടോ എടുക്കുക',
    chooseGallery: 'ഗാലറിയിൽ നിന്ന് തിരഞ്ഞെടുക്കുക',
    retake: 'വീണ്ടും എടുക്കുക',
    removePhoto: 'നീക്കുക',
    photoFailed: 'ഫോട്ടോ ചേർക്കാനായില്ല',
    type: 'തരം',
    howMuch: 'ഓരോ തവണയും എത്ര',
    less: 'കുറയ്ക്കുക',
    more: 'കൂട്ടുക',
    when: 'എപ്പോൾ ഓർമ്മിപ്പിക്കണം',
    change: 'മാറ്റുക',
    removeTime: (time: string) => `${time} നീക്കുക`,
    addTime: '+ ഒരു സമയം ചേർക്കുക',
    timeTaken: 'ആ സമയം ഇതിനകം ചേർത്തിട്ടുണ്ട്.',
    howLong: 'എത്ര ദിവസം',
    nDays: (days: number) => `${days} ദിവസം`,
    otherDays: 'മറ്റുള്ളവ…',
    noEnd: 'അവസാനമില്ല',
    days: 'ദിവസങ്ങൾ',
    starts: 'തുടങ്ങുന്നത്',
    startsToday: 'ഇന്ന്',
    startsTomorrow: 'നാളെ',
    saveFailed: 'മരുന്ന് സേവ് ചെയ്യാനായില്ല',
    deleteConfirm: 'ഈ മരുന്ന് നീക്കം ചെയ്യണോ?',
    deleteFailed: 'മരുന്ന് നീക്കം ചെയ്യാനായില്ല',
    exactAlarmTitle: 'അലാറം വെക്കാൻ PillSaathi-ക്ക് അനുമതി വേണം',
    exactAlarmBody:
      'അനുമതിയില്ലെങ്കിൽ Android കൃത്യസമയത്ത് മരുന്ന് ഓർമ്മിപ്പിച്ചേക്കില്ല.',
    notNow: 'ഇപ്പോൾ വേണ്ട',
    allow: 'അനുവദിക്കുക',
  },
  health: {
    notifications:
      'അറിയിപ്പുകൾ ഓഫാണ്, അതിനാൽ അലാറങ്ങൾ കാണിക്കില്ല. ഓണാക്കാൻ അമർത്തുക.',
    alarmChannel: 'അലാറം അറിയിപ്പുകൾ ഓഫാണ്. ഓണാക്കാൻ അമർത്തുക.',
    exactAlarm:
      'അലാറം വെക്കാൻ PillSaathi-ക്ക് അനുമതിയില്ല. അനുവദിക്കാൻ അമർത്തുക.',
    fullScreen:
      'ലോക്ക് സ്ക്രീനിൽ അലാറം കാണിക്കാനാവില്ല. അനുവദിക്കാൻ അമർത്തുക.',
    backgroundRestricted:
      'പശ്ചാത്തല ഉപയോഗം നിയന്ത്രിച്ചിരിക്കുന്നു, അതിനാൽ അലാറം മുഴങ്ങിയേക്കില്ല. ശരിയാക്കാൻ അമർത്തുക.',
    alarmVolume: 'അലാറം ശബ്ദം ഓഫാണ്. കൂട്ടാൻ അമർത്തുക.',
    batteryOptimization:
      'ബാറ്ററി ലാഭിക്കൽ അലാറങ്ങൾ നിർത്തിയേക്കാം. നിയന്ത്രണമില്ലാത്ത ബാറ്ററി ഉപയോഗം അനുവദിക്കാൻ അമർത്തുക.',
    setup:
      'ഈ ഫോണിൽ അലാറങ്ങൾ മുടങ്ങാതെ മുഴങ്ങാൻ സജ്ജീകരണം പൂർത്തിയാക്കുക.',
    more: (count: number) => ` (+${count} കൂടി)`,
  },
  sound: {
    title: 'ശബ്ദം',
    record: '● റെക്കോർഡ്',
    import: '⇪ ഇംപോർട്ട്',
    importing: 'ഇംപോർട്ട് ചെയ്യുന്നു…',
    yourSounds: 'നിങ്ങളുടെ ശബ്ദങ്ങൾ',
    recorded: 'റെക്കോർഡ് ചെയ്തത്',
    imported: 'ഇംപോർട്ട് ചെയ്തത്',
    play: (name: string) => `${name} പ്ലേ ചെയ്യുക`,
    stop: (name: string) => `${name} നിർത്തുക`,
    changeFailed: 'ശബ്ദം മാറ്റാനായില്ല',
    playFailed: 'ശബ്ദം പ്ലേ ചെയ്യാനായില്ല',
    unsupported:
      'ആ ഫയൽ പ്ലേ ചെയ്യാനാവില്ല. mp3, m4a, wav അല്ലെങ്കിൽ ogg ഫയൽ ശ്രമിക്കുക.',
    importFailed: 'ഫയൽ ഇംപോർട്ട് ചെയ്യാനായില്ല',
    deleteTitle: (name: string) => `“${name}” നീക്കം ചെയ്യണോ?`,
    usedBy: (names: string) =>
      `ഇത് ഉപയോഗിക്കുന്നത്: ${names}. അവയ്ക്ക് സാധാരണ അലാറം ശബ്ദം ആകും.`,
    deleteFailed: 'ശബ്ദം നീക്കം ചെയ്യാനായില്ല',
  },
  record: {
    title: 'റെക്കോർഡ്',
    upTo: '2:00 വരെ',
    start: 'റെക്കോർഡിംഗ് തുടങ്ങുക',
    stop: 'റെക്കോർഡിംഗ് നിർത്തുക',
    tapToStop: 'നിർത്താൻ അമർത്തുക',
    listen: '▶ കേൾക്കുക',
    stopListening: '■ നിർത്തുക',
    redo: '↺ വീണ്ടും',
    name: 'പേര്',
    defaultName: 'എന്റെ റെക്കോർഡിംഗ്',
    use: 'ഈ ശബ്ദം ഉപയോഗിക്കുക',
    micOffTitle: 'മൈക്രോഫോൺ അനുമതി ഓഫാണ്',
    micMessage:
      'അലാറം ശബ്ദം റെക്കോർഡ് ചെയ്യാൻ PillSaathi-ക്ക് മൈക്രോഫോൺ വേണം.',
    allowMic: 'മൈക്രോഫോൺ അനുവദിക്കുക',
    notSaved: 'ആ റെക്കോർഡിംഗ് സേവ് ചെയ്യാനായില്ല. വീണ്ടും ശ്രമിക്കുക.',
    startFailed: 'റെക്കോർഡിംഗ് തുടങ്ങാനായില്ല',
    tooShort: 'ആ റെക്കോർഡിംഗ് വളരെ ചെറുതാണ്. വീണ്ടും ശ്രമിക്കുക.',
    saveFailed: 'റെക്കോർഡിംഗ് സേവ് ചെയ്യാനായില്ല',
    playFailed: 'റെക്കോർഡിംഗ് പ്ലേ ചെയ്യാനായില്ല',
    changeFailed: 'ശബ്ദം മാറ്റാനായില്ല',
  },
  setup: {
    title: 'അലാറങ്ങൾ മുടങ്ങാതിരിക്കാൻ',
    intro:
      'ചില ഫോണുകൾ പശ്ചാത്തലത്തിലുള്ള ആപ്പുകൾ നിർത്തും. അലാറങ്ങൾ എപ്പോഴും മുഴങ്ങാൻ ഈ ഘട്ടങ്ങൾ ഒരിക്കൽ ചെയ്യുക.',
    done: 'ചെയ്തു',
    doneTick: 'ചെയ്തു ✓',
    allowed: '✓ അനുവദിച്ചു',
    finish: 'പൂർത്തിയായി',
    steps: {
      lockRecents: {
        title: 'സമീപകാല ആപ്പുകളിൽ PillSaathi ലോക്ക് ചെയ്യുക',
        body: 'സമീപകാല ആപ്പുകൾ തുറന്ന്, PillSaathi കാർഡ് അമർത്തിപ്പിടിച്ച് Lock അമർത്തുക.',
      },
      battery: {
        title: 'ബാറ്ററി ഉപയോഗം നിയന്ത്രണമില്ലാതെ അനുവദിക്കുക',
        body: "ബാറ്ററി ലാഭിക്കൽ അലാറങ്ങൾ വൈകിപ്പിക്കുകയോ നിർത്തുകയോ ചെയ്യാം. അടുത്ത സ്ക്രീനിൽ All apps തിരഞ്ഞെടുത്ത്, PillSaathi കണ്ടെത്തി Don't optimise തിരഞ്ഞെടുക്കുക.",
      },
      xiaomiAutostart: {
        title: 'Autostart ഓണാക്കുക',
        body: 'പട്ടികയിൽ PillSaathi കണ്ടെത്തി ഓണാക്കുക.',
      },
      xiaomiBattery: {
        title: 'Battery saver, No restrictions ആക്കുക',
        body: 'PillSaathi അമർത്തി No restrictions തിരഞ്ഞെടുക്കുക.',
      },
      oppoAutostart: {
        title: 'Auto-launch അനുവദിക്കുക',
        body: 'പട്ടികയിൽ PillSaathi കണ്ടെത്തി ഓണാക്കുക.',
      },
      oppoBattery: {
        title: 'Background activity അനുവദിക്കുക',
        body: 'PillSaathi-യുടെ Battery തുറന്ന് Allow background activity ഓണാക്കുക.',
      },
      vivoAutostart: {
        title: 'Background start (Autostart) അനുവദിക്കുക',
        body: 'പട്ടികയിൽ PillSaathi കണ്ടെത്തി ഓണാക്കുക.',
      },
      vivoBattery: {
        title: 'High background power use അനുവദിക്കുക',
        body: 'PillSaathi-യുടെ Battery തുറന്ന് high background power use അനുവദിക്കുക.',
      },
      samsungSleeping: {
        title: 'Sleeping, Deep sleeping apps-ൽ നിന്ന് PillSaathi നീക്കുക',
        body: 'Sleeping apps-ഉം Deep sleeping apps-ഉം തുറന്ന്, രണ്ട് പട്ടികയിൽ നിന്നും PillSaathi നീക്കുക.',
      },
      huaweiLaunch: {
        title: 'App launch, Manage manually ആക്കി എല്ലാം അനുവദിക്കുക',
        body: 'PillSaathi അമർത്തി Manage manually തിരഞ്ഞെടുത്ത്, മൂന്ന് ഓപ്ഷനുകളും ഓണാക്കുക.',
      },
    },
  },
  settings: {
    title: 'ക്രമീകരണങ്ങൾ',
    language: 'ഭാഷ',
    draft: ' (കരട്)',
    whenItRings: 'മുഴങ്ങുമ്പോൾ',
    readAloud: 'മരുന്നുകളുടെ പേര് ഉറക്കെ വായിക്കുക',
    tryIt: 'കേട്ടുനോക്കുക',
    textSize: 'അക്ഷര വലുപ്പം',
    textSizeNote: 'PillSaathi നിങ്ങളുടെ ഫോണിലെ അക്ഷര വലുപ്പം പിന്തുടരുന്നു.',
    reliability: 'വിശ്വാസ്യത',
    makeReliable: 'അലാറങ്ങൾ മുടങ്ങാതിരിക്കാൻ',
    saveFailed: 'സേവ് ചെയ്യാനായില്ല',
    noVoice: (language: string) =>
      `നിങ്ങളുടെ ഫോണിൽ ${language} ശബ്ദമില്ല, അതിനാൽ ഇംഗ്ലീഷിൽ വായിച്ചു.`,
    noSpeech:
      'നിങ്ങളുടെ ഫോണിന് ഉറക്കെ വായിക്കാനാവില്ല. ഫോണിന്റെ ക്രമീകരണങ്ങളിൽ ഒരു text-to-speech ശബ്ദം ചേർക്കുക.',
    openVoiceSettings: 'ശബ്ദ ക്രമീകരണങ്ങൾ തുറക്കുക',
  },
  report: {
    title: (range: string) => `PillSaathi · ${range}`,
    taken: (taken: number, total: number, percent: number) =>
      `${total} ഡോസിൽ ${taken} എണ്ണം കഴിച്ചു (${percent}%)`,
    noDoses: 'ഡോസുകളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല',
    notTaken: 'കഴിക്കാത്തവ:',
    notTakenNone: 'കഴിക്കാത്തവ: ഇല്ല',
    doseLine: (day: string, time: string, outcome: string, pills: string) =>
      `• ${day}, ${time}: ${outcome} (${pills})`,
    missed: 'നഷ്ടമായി',
    skipped: 'ഒഴിവാക്കി',
    medicines: 'ഇപ്പോഴത്തെ മരുന്നുകൾ:',
    medicinesNone: 'ഇപ്പോഴത്തെ മരുന്നുകൾ: ഇല്ല',
    pillLine: (name: string, amount: string, times: string, end: string) =>
      `• ${name}: ${amount}, ${times}, ${end}`,
    noEnd: 'അവസാന തീയതിയില്ല',
    lastDay: (day: string) => `അവസാന ദിവസം ${day}`,
  },
};
