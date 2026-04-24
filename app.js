const API_BASE = `${window.location.origin}/api`;

let state = {
    notes: [],
    currentNote: null,
    currentCategory: 'all',
    sortBy: 'updated'
};

const el = {
    categoryItems: document.querySelectorAll('.category-item'),
    searchInput: document.getElementById('searchInput'),
    newNoteBtn: document.getElementById('newNoteBtn'),
    notesList: document.getElementById('notesList'),
    emptyState: document.getElementById('emptyState'),
    categoryTitle: document.getElementById('categoryTitle'),
    sortSelect: document.getElementById('sortSelect'),
    editor: document.getElementById('editor'),
    placeholder: document.getElementById('placeholder'),
    noteTitle: document.getElementById('noteTitle'),
    noteContent: document.getElementById('noteContent'),
    noteCategory: document.getElementById('noteCategory'),
    tagsInput: document.getElementById('tagsInput'),
    tagsDisplay: document.getElementById('tagsDisplay'),
    saveBtn: document.getElementById('saveBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    closeBtn: document.getElementById('closeBtn'),
    lastSaved: document.getElementById('lastSaved')
};

// Init
async function init() {
    console.log('🚀 Inizializzazione...');
    await loadNotes();
    attachEvents();
}

function attachEvents() {
    el.categoryItems.forEach(item => {
        item.addEventListener('click', () => selectCategory(item));
    });

    el.searchInput.addEventListener('input', debounce(handleSearch, 300));
    el.newNoteBtn.addEventListener('click', createNote);
    el.saveBtn.addEventListener('click', () => saveNote(false));
    el.deleteBtn.addEventListener('click', deleteNote);
    el.closeBtn.addEventListener('click', closeEditor);
    el.tagsInput.addEventListener('keydown', handleTagInput);
    el.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderNotes();
    });

    // Auto-save
    let timer;
    [el.noteTitle, el.noteContent, el.noteCategory].forEach(elem => {
        elem.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (state.currentNote) saveNote(true);
            }, 2000);
        });
    });
}

// Load notes
async function loadNotes() {
    try {
        const res = await fetch(`${API_BASE}/notes`);
        state.notes = await res.json();
        console.log(`✅ Caricate ${state.notes.length} note`);
        renderNotes();
        updateCounts();
    } catch (err) {
        console.error('❌ Errore caricamento:', err);
    }
}

// Select category
function selectCategory(item) {
    el.categoryItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    state.currentCategory = item.dataset.category;
    el.searchInput.value = '';

    const name = item.querySelector('span:nth-child(2)').textContent;
    el.categoryTitle.textContent = name;

    renderNotes();
}

// Search
async function handleSearch(e) {
    const query = e.target.value.trim();

    if (query) {
        try {
            const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
            state.notes = await res.json();
            el.categoryTitle.textContent = `Risultati per "${query}"`;
        } catch (err) {
            console.error('❌ Errore ricerca:', err);
        }
    } else {
        await loadNotes();
    }

    renderNotes();
}

// Create note
async function createNote() {
    console.log('📝 Creazione nota...');

    const newNote = {
        title: 'Nuova Nota',
        content: '',
        category: state.currentCategory !== 'all' ? state.currentCategory : 'Progetti',
        tags: []
    };

    try {
        const res = await fetch(`${API_BASE}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newNote)
        });

        const created = await res.json();
        console.log('✅ Nota creata:', created.id);

        state.notes.unshift(created);
        state.currentNote = created;

        renderNotes();
        openEditor(created);
        updateCounts();

        setTimeout(() => {
            el.noteTitle.focus();
            el.noteTitle.select();
        }, 100);

    } catch (err) {
        console.error('❌ Errore creazione:', err);
        alert('Errore nella creazione della nota');
    }
}

// Save note
async function saveNote(isAuto = false) {
    if (!state.currentNote) return;

    const updated = {
        title: el.noteTitle.value || 'Senza titolo',
        content: el.noteContent.value,
        category: el.noteCategory.value,
        tags: getTags()
    };

    try {
        const res = await fetch(`${API_BASE}/notes/${state.currentNote.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });

        const saved = await res.json();

        const idx = state.notes.findIndex(n => n.id === saved.id);
        if (idx !== -1) state.notes[idx] = saved;
        state.currentNote = saved;

        renderNotes();
        updateCounts();

        const now = new Date();
        el.lastSaved.textContent = `Salvato alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;

        if (!isAuto) console.log('✅ Nota salvata');

    } catch (err) {
        console.error('❌ Errore salvataggio:', err);
    }
}

// Delete note
async function deleteNote() {
    if (!state.currentNote) return;
    if (!confirm('Eliminare questa nota?')) return;

    try {
        await fetch(`${API_BASE}/notes/${state.currentNote.id}`, {
            method: 'DELETE'
        });

        state.notes = state.notes.filter(n => n.id !== state.currentNote.id);
        state.currentNote = null;

        closeEditor();
        renderNotes();
        updateCounts();

        console.log('✅ Nota eliminata');

    } catch (err) {
        console.error('❌ Errore eliminazione:', err);
    }
}

// Open editor
function openEditor(note) {
    state.currentNote = note;

    el.noteTitle.value = note.title;
    el.noteContent.value = note.content;
    el.noteCategory.value = note.category;

    renderTags(note.tags);

    el.editor.classList.add('active');
    el.placeholder.classList.add('hidden');

    const date = new Date(note.updated_at);
    el.lastSaved.textContent = `Ultima modifica: ${date.toLocaleString('it-IT')}`;

    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.toggle('active', card.dataset.id === note.id);
    });
}

// Close editor
function closeEditor() {
    state.currentNote = null;
    el.editor.classList.remove('active');
    el.placeholder.classList.remove('hidden');

    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('active');
    });
}

// Tags
function handleTagInput(e) {
    if (e.key === 'Enter' && e.target.value.trim()) {
        e.preventDefault();
        const tag = e.target.value.trim();
        const tags = getTags();

        if (!tags.includes(tag)) {
            tags.push(tag);
            renderTags(tags);
        }

        e.target.value = '';
    }
}

function getTags() {
    return Array.from(el.tagsDisplay.querySelectorAll('.tag-item'))
        .map(t => t.dataset.tag);
}

function renderTags(tags) {
    el.tagsDisplay.innerHTML = tags.map(tag => `
        <span class="tag-item" data-tag="${esc(tag)}">
            ${esc(tag)}
            <span class="tag-remove" onclick="removeTag('${esc(tag)}')">×</span>
        </span>
    `).join('');
}

function removeTag(tag) {
    const tags = getTags().filter(t => t !== tag);
    renderTags(tags);
}

// Render notes
function renderNotes() {
    let filtered = state.notes;

    if (state.currentCategory !== 'all') {
        filtered = filtered.filter(n => n.category === state.currentCategory);
    }

    filtered = sortNotes(filtered);

    if (filtered.length === 0) {
        el.notesList.style.display = 'none';
        el.emptyState.classList.add('visible');
        return;
    }

    el.notesList.style.display = 'block';
    el.emptyState.classList.remove('visible');

    el.notesList.innerHTML = filtered.map(note => {
        const date = new Date(note.updated_at);
        const preview = note.content.substring(0, 100) || 'Nessun contenuto';

        return `
            <div class="note-card ${state.currentNote?.id === note.id ? 'active' : ''}" 
                 data-id="${note.id}"
                 onclick="openNoteById('${note.id}')">
                <div class="note-card-header">
                    <div class="note-card-title">${esc(note.title)}</div>
                    <div class="note-card-category">${getIcon(note.category)} ${note.category}</div>
                </div>
                <div class="note-card-preview">${esc(preview)}</div>
                <div class="note-card-footer">
                    <div class="note-card-tags">
                        ${note.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
                    </div>
                    <div class="note-card-date">${formatDate(date)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function openNoteById(id) {
    const note = state.notes.find(n => n.id === id);
    if (note) openEditor(note);
}

function sortNotes(notes) {
    const sorted = [...notes];

    switch (state.sortBy) {
        case 'updated':
            return sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        case 'created':
            return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        case 'title':
            return sorted.sort((a, b) => a.title.localeCompare(b.title, 'it'));
        default:
            return sorted;
    }
}

function updateCounts() {
    const counts = {
        all: state.notes.length,
        Progetti: state.notes.filter(n => n.category === 'Progetti').length,
        Aree: state.notes.filter(n => n.category === 'Aree').length,
        Risorse: state.notes.filter(n => n.category === 'Risorse').length,
        Archivi: state.notes.filter(n => n.category === 'Archivi').length
    };

    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-progetti').textContent = counts.Progetti;
    document.getElementById('count-aree').textContent = counts.Aree;
    document.getElementById('count-risorse').textContent = counts.Risorse;
    document.getElementById('count-archivi').textContent = counts.Archivi;
}

// Utils
function getIcon(cat) {
    const icons = { 'Progetti': '🎯', 'Aree': '🏠', 'Risorse': '💡', 'Archivi': '📦' };
    return icons[cat] || '📝';
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Oggi';
    if (days === 1) return 'Ieri';
    if (days < 7) return `${days} giorni fa`;
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Start
init();
