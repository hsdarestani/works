/* Confirmed project links and extra project records.
   Loaded after data.js and before app.js. */

const confirmedProjectLinks = {
  103: 'https://solution.smarbiz.sbs',
  203: 'https://esthetic.smarbiz.sbs',
  301: 'https://parkplatz.smarbiz.sbs',
  302: 'http://smartdocs.aplus-solution.de/',
  303: 'http://publisher.smarbiz.sbs/',
  304: 'https://studio.aplus-solution.de/',
  306: 'https://team.smarbiz.sbs/',
  307: 'https://pay.smarbiz.sbs/',
  309: 'https://aplus-solution.de/wiw',
  601: 'http://cards.smarbiz.sbs/'
};

P.forEach((project) => {
  if (confirmedProjectLinks[project.id]) {
    project.url = confirmedProjectLinks[project.id];
  }
});

if (!P.some((project) => project.id === 310)) {
  P.push({
    id: 310,
    account_id: 3,
    title_de: 'Arbeitszeitkonto',
    title_fa: 'حساب ساعات کاری',
    kind: 'product',
    status: 'planning',
    url: 'https://aplus-solution.de/arbeitszeitkonto/',
    progress: 20,
    sort_order: 10,
    description_de: '',
    description_fa: ''
  });
}
