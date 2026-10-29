// Tüm "sihirli sayılar" burada. Ekonomiyi ayarlamak için sadece bu dosyayı değiştir.

export const CONFIG = {
  schemaVersion: 1,
  storageKey: 'pomodoroOyun.kayit',
  lockKey: 'pomodoroOyun.kilit',
  channelName: 'pomodoroOyun.kanal',
  appVersion: '1.0.0',

  // Zamanlayıcı (süreler dakika, "Ms" ile bitenler milisaniye)
  timer: {
    focusOptions: [15, 25, 35, 45],
    defaultFocus: 25,
    shortBreakOptions: [5, 10],
    defaultShortBreak: 5,
    longBreak: 15,
    setSize: 4, // Kaç Pomodoro'da bir uzun mola
    pauseMaxMs: 2 * 60 * 1000, // Tek duraklatma hakkı: en çok 2 dk
    hiddenMaxMs: 30 * 1000, // Sekme bu kadar gizli kalırsa oturum geçersiz
    clockToleranceMs: 3000, // Saat farkı toleransı
    heartbeatMs: 1000,
    lockStaleMs: 5000, // Kilit bu kadar süre yenilenmezse "ölü" sayılır
    maxLabelLength: 40,
  },

  // Oyun ekonomisi
  economy: {
    coinsPerMinute: 4, // 25 dk = 100, 45 dk = 180
    baseFocusMinutes: 25,
    firstOfDayBonus: 20,
    setBonus: 50,
    taskBonus: 5,
    dailyRewardedCap: 8, // Günde en çok 8 Pomodoro para verir
    sleepReminderHour: 23,
    sleepReminderEndHour: 5,
  },

  // Seri
  streak: {
    freezePerWeek: 1,
  },

  // Haftalık olay (maç, festival, defile, sahiplendirme günü)
  weekly: {
    randomness: 0.1, // ±%10
    minuteBonus: 0.1, // Haftalık odak dakikası başına güç puanı
    winMargin: 0.05,
    eventHour: 18, // Pazar akşamı bu saatten sonra o haftanın olayı gerçekleşir
    winCoins: 150,
    drawCoins: 100,
    loseCoins: 60,
  },

  // Seviye eşikleri, tema gücünün en yüksek değerinin oranı olarak (araçlar/temalari-uret.mjs)
  levelFractions: [0, 0.08, 0.22, 0.42, 0.68],

  tiers: {
    bronze: { id: 'bronze', price: 300, minLevel: 1, icon: '🥉' },
    silver: { id: 'silver', price: 800, minLevel: 2, icon: '🥈' },
    gold: { id: 'gold', price: 1800, minLevel: 3, icon: '🥇' },
    legend: { id: 'legend', price: 4000, minLevel: 4, icon: '💎' },
  },

  goals: [2, 4, 6, 8],
  defaultDailyGoal: 4,

  stats: {
    heatmapWeeks: 18,
  },

  research: {
    surveyGapDays: 14,
    controlDays: 3,
    unlockTaps: 5,
    questionCount: 3,
  },

  fontScales: [0.9, 1, 1.15, 1.3],
};

export const THEME_IDS = ['football', 'cafe', 'fashion', 'shelter'];
