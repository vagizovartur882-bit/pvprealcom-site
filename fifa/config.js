/* Кубок FIFA PS5 — настройки организатора.
   Этот файл публичный (его видит любой, кто откроет приложение).
   PIN только прячет кнопки администратора, это не защита данных.
   Замените все значения с пометкой PLACEHOLDER до турнира. */
window.FIFA_CONFIG = {
  organizerPin: "0000", // PLACEHOLDER: PIN организатора
  organizerName: "Организатор", // PLACEHOLDER: как к вам обращаться

  payment: {
    amountRub: 1000, // PLACEHOLDER: сумма предоплаты, ₽
    sbpPhone: "+7 900 000-00-00", // PLACEHOLDER: телефон для перевода по СБП
    cardNumber: "0000 0000 0000 0000", // PLACEHOLDER: номер карты
    recipient: "ИМЯ ФАМИЛИЯ", // PLACEHOLDER: получатель
    bank: "НАЗВАНИЕ БАНКА", // PLACEHOLDER: банк
    purpose: "Кубок FIFA PS5" // PLACEHOLDER: назначение платежа
  },

  telegram: {
    username: "organizer_username", // PLACEHOLDER: логин без @
    groupUrl: "https://t.me/+REPLACE_WITH_GROUP_INVITE" // PLACEHOLDER: ссылка на группу турнира
  },

  /* Общая база подключается позже. Пока url и anonKey пустые —
     заявки живут только в браузере организатора.
     Как включить Supabase: комментарий в начале data-port.js. */
  supabase: {
    url: "", // PLACEHOLDER: https://xxxxxxxx.supabase.co
    anonKey: "" // PLACEHOLDER: anon public key
  }
};
