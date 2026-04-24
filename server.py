#!/usr/bin/env python3
"""
Server Flask per webapp di notetaking con metodo PARA
Gestisce persistenza dati su file JSON
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__, static_folder='.')
CORS(app, resources={r"/*": {"origins": "*"}})

# File di persistenza
DATA_FILE = 'notes_data.json'

# Struttura dati iniziale
DEFAULT_DATA = {
    'notes': [],
    'categories': ['Progetti', 'Aree', 'Risorse', 'Archivi']
}

def load_data():
    """Carica i dati dal file JSON"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"Errore nel leggere {DATA_FILE}, uso dati di default")
            return DEFAULT_DATA.copy()
    return DEFAULT_DATA.copy()

def save_data(data):
    """Salva i dati nel file JSON"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Errore nel salvare i dati: {e}")
        return False

@app.route('/')
def index():
    """Serve la pagina principale"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve file statici (CSS, JS)"""
    return send_from_directory('.', path)

@app.route('/api/notes', methods=['GET'])
def get_notes():
    """Recupera tutte le note"""
    data = load_data()
    print(f"GET /api/notes - Ritorno {len(data['notes'])} note")
    return jsonify(data)

@app.route('/api/notes', methods=['POST'])
def create_note():
    """Crea una nuova nota"""
    data = load_data()
    note_data = request.json

    print(f"POST /api/notes - Ricevuto: {note_data}")

    # Crea nuova nota con ID univoco e timestamp
    new_note = {
        'id': str(uuid.uuid4()),
        'title': note_data.get('title', 'Nuova Nota'),
        'content': note_data.get('content', ''),
        'category': note_data.get('category', 'Progetti'),
        'tags': note_data.get('tags', []),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }

    data['notes'].append(new_note)

    if save_data(data):
        print(f"Nota creata con successo: {new_note['id']}")
        return jsonify(new_note), 201
    else:
        return jsonify({'error': 'Errore nel salvare la nota'}), 500

@app.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    """Aggiorna una nota esistente"""
    data = load_data()
    note_data = request.json

    print(f"PUT /api/notes/{note_id} - Ricevuto: {note_data}")

    # Trova e aggiorna la nota
    for i, note in enumerate(data['notes']):
        if note['id'] == note_id:
            data['notes'][i].update({
                'title': note_data.get('title', note['title']),
                'content': note_data.get('content', note['content']),
                'category': note_data.get('category', note['category']),
                'tags': note_data.get('tags', note['tags']),
                'updated_at': datetime.now().isoformat()
            })

            if save_data(data):
                print(f"Nota aggiornata: {note_id}")
                return jsonify(data['notes'][i])
            else:
                return jsonify({'error': 'Errore nel salvare la nota'}), 500

    return jsonify({'error': 'Nota non trovata'}), 404

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Elimina una nota"""
    data = load_data()

    print(f"DELETE /api/notes/{note_id}")

    # Filtra la nota da eliminare
    original_length = len(data['notes'])
    data['notes'] = [note for note in data['notes'] if note['id'] != note_id]

    if len(data['notes']) < original_length:
        if save_data(data):
            print(f"Nota eliminata: {note_id}")
            return jsonify({'message': 'Nota eliminata con successo'})
        else:
            return jsonify({'error': 'Errore nel salvare i dati'}), 500

    return jsonify({'error': 'Nota non trovata'}), 404

@app.route('/api/search', methods=['GET'])
def search_notes():
    """Cerca nelle note per titolo, contenuto e tag"""
    query = request.args.get('q', '').lower()

    print(f"GET /api/search?q={query}")

    if not query:
        return jsonify([])

    data = load_data()
    results = []

    for note in data['notes']:
        # Cerca in titolo, contenuto e tag
        if (query in note['title'].lower() or 
            query in note['content'].lower() or 
            any(query in tag.lower() for tag in note['tags'])):
            results.append(note)

    print(f"Trovati {len(results)} risultati")
    return jsonify(results)

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Server PARA Notes avviato")
    print("📍 URL: http://localhost:5000")
    print("📝 Webapp di notetaking con metodo PARA")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=True)
