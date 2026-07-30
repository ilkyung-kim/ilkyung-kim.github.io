const languageButton = document.querySelector('.language-toggle');
let language = 'ko';

languageButton.addEventListener('click', () => {
  language = language === 'ko' ? 'en' : 'ko';
  document.documentElement.lang = language;
  languageButton.textContent = language === 'ko' ? 'EN' : 'KO';
  document.querySelectorAll('[data-ko][data-en]').forEach((element) => {
    element.innerHTML = element.dataset[language];
  });
});
