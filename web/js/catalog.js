class GameCatalog {
    constructor(document) {
        this.form = document.querySelector('#catalog-controls');
        this.list = document.querySelector('#game-list');
        this.search = document.querySelector('#title-search');
        this.genre = document.querySelector('#genre-filter');
        this.sort = document.querySelector('#sort-order');
        this.count = document.querySelector('#result-count');
        this.empty = document.querySelector('#empty-state');
        this.cards = [...this.list.children].map((element, index) => ({
            element, index,
            title: element.querySelector('h2').textContent,
            date: element.dataset.date,
            genre: element.dataset.genre
        }));
        this.collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });
    }

    init() {
        const genres = [...new Set(this.cards.map(card => card.genre))];
        genres.sort(this.collator.compare).forEach(genre => this.genre.add(new Option(genre, genre)));
        this.form.hidden = false;
        this.form.addEventListener('submit', event => event.preventDefault());
        this.form.addEventListener('input', () => this.update());
        this.form.addEventListener('change', () => this.update());
        this.form.addEventListener('reset', () => {
            // Reset values explicitly so count and ordering update in the same event.
            this.search.value = '';
            this.genre.value = '';
            this.sort.value = 'newest';
            this.update();
        });
        this.update();
    }

    normalize(value) { return value.normalize('NFKC').toLocaleLowerCase('ja').trim(); }

    compare(a, b) {
        if (this.sort.value === 'name') return this.collator.compare(a.title, b.title) || a.index - b.index;
        // Missing dates always come last. Original order breaks ties in both directions.
        if (!a.date || !b.date) return Number(!a.date) - Number(!b.date) || a.index - b.index;
        return (this.sort.value === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.index - b.index;
    }

    update() {
        const query = this.normalize(this.search.value);
        let visible = 0;
        [...this.cards].sort((a, b) => this.compare(a, b)).forEach(card => {
            card.element.hidden = !(this.normalize(card.title).includes(query) && (!this.genre.value || card.genre === this.genre.value));
            if (!card.element.hidden) visible++;
            this.list.append(card.element);
        });
        this.count.textContent = `${visible} / ${this.cards.length}件の作品`;
        this.empty.hidden = visible !== 0;
    }
}

new GameCatalog(document).init();
