/**
 * PARA Notes - Applicazione di notetaking con metodo PARA
 * Gestione completa di note con categorie, tag e ricerca
 */

// Configurazione API
const API_BASE = 'http://localhost:5000/api';

// State dell'applicazione
let appState = {
    notes: [],
    currentNote: null,
    currentCategory: 'all',
    searchQuery: '',
    sortBy: 'updated'
};

// Elementi DOM
const elements = {
    // Sidebar
    categoryItems: document.querySelectorAll('.category-item'),
    searchInput: document.getElementById('searchInput'),
    newNoteBtn: document.getElementById('newNoteBtn'),

    // Lista note
    notesList: document.getElementById('notesList'),
    emptyState: document.getElementById('emptyState'),
    currentCategoryTitle: document.getElementById('currentCategoryTitle'),
    sortSelect: document.getElementById('sortSelect'),

    // Editor
    noteEditor: document.getElementById('noteEditor'),
    notePlaceholder: document.getElementById('notePlaceholder'),
    noteTitle: document.getElementById('noteTitle'),
    noteContent: document.getElementById('noteContent'),
    noteCategory: document.getElementById('noteCategory'),
    noteTags: document.getElementById('noteTags'),
    tagsDisplay: document.getElementById('tagsDisplay'),
    saveNoteBtn: document.getElementById('saveNoteBtn'),
    deleteNoteBtn: document.getElementById('deleteNoteBtn'),
    closeEditorBtn: document.getElementById('closeEditorBtn'),
    lastSaved: document.getElementById('lastSaved')
};

// Inizializzazione app
function init() {
    console.log('🚀 Inizializzazione PARA Notes...');
    loadNotes();
    attachEventListeners();
}

// Event listeners
function attachEventListeners() {
    // Categorie
    elements.categoryItems.forEach(item => {
        item.addEventListener('click', () => handleCategoryClick(item));
    });

    // Ricerca
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Nuova nota
    elements.newNoteBtn.addEventListener('click', () => {
        console.log('🆕 Click su Nuova Nota');
        createNewNote();
    });

    // Editor
    elements.saveNoteBtn.addEventListener('click', () => saveCurrentNote(false));
    elements.deleteNoteBtn.addEventListener('click', deleteCurrentNote);
    elements.closeEditorBtn.addEventListener('click', closeEditor);

    // Tag input
    elements.noteTags.addEventListener('keydown', handleTagInput);

    // Ordinamento
    elements.sortSelect.addEventListener('change', (e) => {
        appState.sortBy = e.target.value;
        renderNotesList();
    });

    // Auto-save su modifica
    let autoSaveTimer;
    [elements.noteTitle, elements.noteContent, elements.noteCategory].forEach(el => {
        el.addEventListener('input', () => {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                if (appState.currentNote) {
                    saveCurrentNote(true);
                }
            }, 2000);
        });
    });
}

// Carica tutte le note dal server
async function loadNotes() {
    try {
        console.log('📥 Caricamento note...');
        const response = await fetch(`${API_BASE}/notes`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        appState.notes = data.notes || [];
        console.log(`✅ Caricate ${appState.notes.length} note`);

        renderNotesList();
        updateCategoryCounts();
    } catch (error) {
        console.error('❌ Errore nel caricamento delle note:', error);
        showNotification('Errore nel caricamento delle note. Verifica che il server sia avviato.', 'error');
    }
}

// Gestione click su categoria
function handleCategoryClick(item) {
    // Aggiorna UI
    elements.categoryItems.forEach(el => el.classList.remove('active'));
    item.classList.add('active');

    // Aggiorna state
    appState.currentCategory = item.dataset.category;
    appState.searchQuery = '';
    elements.searchInput.value = '';

    // Aggiorna titolo
    const categoryName = item.querySelector('span:nth-child(2)').textContent;
    elements.currentCategoryTitle.textContent = categoryName;

    console.log(`📁 Categoria selezionata: ${appState.currentCategory}`);

    // Renderizza lista
    renderNotesList();
}

// Gestione ricerca
async function handleSearch(e) {
    const query = e.target.value.trim();
    appState.searchQuery = query;

    console.log(`🔍 Ricerca: "${query}"`);

    if (query) {
        try {
            const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            appState.notes = results;
            elements.currentCategoryTitle.textContent = `Risultati per "${query}"`;
            console.log(`✅ Trovati ${results.length} risultati`);
        } catch (error) {
            console.error('❌ Errore nella ricerca:', error);
        }
    } else {
        await loadNotes();
    }

    renderNotesList();
}

// Crea nuova nota
async function createNewNote() {
    console.log('📝 Creazione nuova nota...');

    const newNote = {
        title: 'Nuova Nota',
        content: '',
        category: appState.currentCategory !== 'all' ? appState.currentCategory : 'Progetti',
        tags: []
    };

    console.log('📤 Invio richiesta POST:', newNote);

    try {
        const response = await fetch(`${API_BASE}/notes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(newNote)
        });

        console.log('📡 Risposta ricevuta:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const createdNote = await response.json();
        console.log('✅ Nota creata:', createdNote);

        appState.notes.unshift(createdNote);
        appState.currentNote = createdNote;

        renderNotesList();
        openEditor(createdNote);
        updateCategoryCounts();

        // Focus sul titolo
        setTimeout(() => {
            elements.noteTitle.focus();
            elements.noteTitle.select();
        }, 100);

        showNotification('Nota creata con successo', 'success');
    } catch (error) {
        console.error('❌ Errore nella creazione della nota:', error);
        showNotification('Errore nella creazione della nota. Verifica che il server sia avviato.', 'error');
    }
}

// Salva nota corrente
async function saveCurrentNote(isAutoSave = false) {
    if (!appState.currentNote) {
        console.warn('⚠️ Nessuna nota da salvare');
        return;
    }

    const updatedNote = {
        title: elements.noteTitle.value || 'Senza titolo',
        content: elements.noteContent.value,
        category: elements.noteCategory.value,
        tags: getCurrentTags()
    };

    console.log(`💾 Salvataggio nota ${appState.currentNote.id}...`);

    try {
        const response = await fetch(`${API_BASE}/notes/${appState.currentNote.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedNote)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const savedNote = await response.json();
        console.log('✅ Nota salvata');

        // Aggiorna state
        const index = appState.notes.findIndex(n => n.id === savedNote.id);
        if (index !== -1) {
            appState.notes[index] = savedNote;
        }
        appState.currentNote = savedNote;

        renderNotesList();
        updateCategoryCounts();

        // Mostra feedback
        const now = new Date();
        elements.lastSaved.textContent = `Salvato alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;

        if (!isAutoSave) {
            showNotification('Nota salvata', 'success');
        }
    } catch (error) {
        console.error('❌ Errore nel salvataggio della nota:', error);
        showNotification('Errore nel salvataggio', 'error');
    }
}

// Elimina nota corrente
async function deleteCurrentNote() {
    if (!appState.currentNote) return;

    if (!confirm('Sei sicuro di voler eliminare questa nota?')) return;

    console.log(`🗑️ Eliminazione nota ${appState.currentNote.id}...`);

    try {
        const response = await fetch(`${API_BASE}/notes/${appState.currentNote.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('✅ Nota eliminata');

        // Rimuovi dallo state
        appState.notes = appState.notes.filter(n => n.id !== appState.currentNote.id);
        appState.currentNote = null;

        closeEditor();
        renderNotesList();
        updateCategoryCounts();

        showNotification('Nota eliminata', 'success');
    } catch (error) {
        console.error('❌ Errore nell\'eliminazione della nota:', error);
        showNotification('Errore nell\'eliminazione', 'error');
    }
}

// Apri editor con nota
function openEditor(note) {
    console.log(`📖 Apertura nota: ${note.title}`);
    appState.currentNote = note;

    // Popola campi
    elements.noteTitle.value = note.title;
    elements.noteContent.value = note.content;
    elements.noteCategory.value = note.category;

    // Renderizza tag
    renderTags(note.tags);

    // Mostra editor
    elements.noteEditor.classList.add('active');
    elements.notePlaceholder.classList.add('hidden');

    // Aggiorna ultima modifica
    const updatedDate = new Date(note.updated_at);
    elements.lastSaved.textContent = `Ultima modifica: ${updatedDate.toLocaleString('it-IT')}`;

    // Evidenzia nota nella lista
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.toggle('active', card.dataset.noteId === note.id);
    });
}

// Chiudi editor
function closeEditor() {
    console.log('❌ Chiusura editor');
    appState.currentNote = null;
    elements.noteEditor.classList.remove('active');
    elements.notePlaceholder.classList.remove('hidden');

    // Rimuovi evidenziazione
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('active');
    });
}

// Gestione input tag
function handleTagInput(e) {
    if (e.key === 'Enter' && e.target.value.trim()) {
        e.preventDefault();
        const tag = e.target.value.trim();
        const currentTags = getCurrentTags();

        if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            renderTags(currentTags);
        }

        e.target.value = '';
    }
}

// Ottieni tag correnti
function getCurrentTags() {
    return Array.from(elements.tagsDisplay.querySelectorAll('.tag-item'))
        .map(el => el.dataset.tag);
}

// Renderizza tag
function renderTags(tags) {
    elements.tagsDisplay.innerHTML = tags.map(tag => `
        <span class="tag-item" data-tag="${escapeHtml(tag)}">
            ${escapeHtml(tag)}
            <span class="tag-remove" onclick="removeTag('${escapeHtml(tag)}')">×</span>
        </span>
    `).join('');
}

// Rimuovi tag
function removeTag(tag) {
    const currentTags = getCurrentTags().filter(t => t !== tag);
    renderTags(currentTags);
}

// Renderizza lista note
function renderNotesList() {
    let filteredNotes = appState.notes;

    // Filtra per categoria
    if (appState.currentCategory !== 'all') {
        filteredNotes = filteredNotes.filter(note => 
            note.category === appState.currentCategory
        );
    }

    // Ordina
    filteredNotes = sortNotes(filteredNotes, appState.sortBy);

    console.log(`📋 Rendering ${filteredNotes.length} note`);

    // Mostra empty state se necessario
    if (filteredNotes.length === 0) {
        elements.notesList.style.display = 'none';
        elements.emptyState.classList.add('visible');
        return;
    }

    elements.notesList.style.display = 'flex';
    elements.emptyState.classList.remove('visible');

    // Renderizza note
    elements.notesList.innerHTML = filteredNotes.map(note => {
        const updatedDate = new Date(note.updated_at);
        const preview = note.content.substring(0, 100) || 'Nessun contenuto';

        return `
            <div class="note-card ${appState.currentNote?.id === note.id ? 'active' : ''}" 
                 data-note-id="${note.id}"
                 onclick="openNoteById('${note.id}')">
                <div class="note-card-header">
                    <div style="flex: 1; min-width: 0;">
                        <div class="note-card-title">${escapeHtml(note.title)}</div>
                    </div>
                    <div class="note-card-category">${getCategoryIcon(note.category)} ${note.category}</div>
                </div>
                <div class="note-card-preview">${escapeHtml(preview)}</div>
                <div class="note-card-footer">
                    <div class="note-card-tags">
                        ${note.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                    <div class="note-card-date">${formatDate(updatedDate)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Apri nota per ID
function openNoteById(noteId) {
    const note = appState.notes.find(n => n.id === noteId);
    if (note) {
        openEditor(note);
    }
}

// Ordina note
function sortNotes(notes, sortBy) {
    const sorted = [...notes];

    switch (sortBy) {
        case 'updated':
            return sorted.sort((a, b) => 
                new Date(b.updated_at) - new Date(a.updated_at)
            );
        case 'created':
            return sorted.sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
            );
        case 'title':
            return sorted.sort((a, b) => 
                a.title.localeCompare(b.title, 'it')
            );
        default:
            return sorted;
    }
}

// Aggiorna contatori categorie
function updateCategoryCounts() {
    const counts = {
        all: appState.notes.length,
        Progetti: appState.notes.filter(n => n.category === 'Progetti').length,
        Aree: appState.notes.filter(n => n.category === 'Aree').length,
        Risorse: appState.notes.filter(n => n.category === 'Risorse').length,
        Archivi: appState.notes.filter(n => n.category === 'Archivi').length
    };

    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-progetti').textContent = counts.Progetti;
    document.getElementById('count-aree').textContent = counts.Aree;
    document.getElementById('count-risorse').textContent = counts.Risorse;
    document.getElementById('count-archivi').textContent = counts.Archivi;
}

// Utility functions
function getCategoryIcon(category) {
    const icons = {
        'Progetti': '🎯',
        'Aree': '🏠',
        'Risorse': '💡',
        'Archivi': '📦'
    };
    return icons[category] || '📝';
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return 'Oggi';
    } else if (days === 1) {
        return 'Ieri';
    } else if (days < 7) {
        return `${days} giorni fa`;
    } else {
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Puoi aggiungere qui un sistema di notifiche toast se vuoi
}

// Avvia l'applicazione quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('✅ Script caricato');
