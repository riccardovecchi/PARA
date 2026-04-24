#!/usr/bin/env python3
"""
Server Flask per webapp di notetaking con metodo PARA
"""

from flask import Flask, request, jsonify, send_file
import json
import os
from datetime import datetime
import uuid
import sys

app = Flask(__name__)

# File di persistenza
DATA_FILE = 'notes_data.json'

def load_data():
    """Carica i dati dal file JSON"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                print(f"📂 File caricato: {len(data.get('notes', []))} note")
                return data
        except Exception as e:
            print(f"⚠️ Errore lettura file: {e}")
            return {'notes': [], 'categories': ['Progetti', 'Aree', 'Risorse', 'Archivi']}
    else:
        print(f"⚠️ File {DATA_FILE} non trovato")
        return {'notes': [], 'categories': ['Progetti', 'Aree', 'Risorse', 'Archivi']}

def save_data(data):
    """Salva i dati nel file JSON"""
    try:
        # Verifica che la cartella sia scrivibile
        test_file = 'test_write.tmp'
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)

        # Salva i dati
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"💾 File salvato: {len(data.get('notes', []))} note")
        return True
    except Exception as e:
        print(f"❌ ERRORE SALVATAGGIO: {e}")
        print(f"❌ Percorso corrente: {os.getcwd()}")
        print(f"❌ Permessi cartella: {oct(os.stat('.').st_mode)[-3:]}")
        return False

# CORS Headers per tutte le richieste
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Gestione preflight OPTIONS per tutte le route API
@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return '', 204

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/style.css')
def style():
    return send_file('style.css')

@app.route('/app.js')
def appjs():
    return send_file('app.js')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    """Recupera tutte le note"""
    data = load_data()
    print(f"✅ GET /api/notes - Ritorno {len(data['notes'])} note")
    return jsonify(data)

@app.route('/api/notes', methods=['POST'])
def create_note():
    """Crea una nuova nota"""
    try:
        data = load_data()
        note_data = request.get_json()

        print(f"📥 POST /api/notes - Ricevuto: {note_data}")

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

        print(f"📝 Tentativo salvataggio nota: {new_note['id']}")

        if save_data(data):
            print(f"✅ Nota creata con successo!")
            return jsonify(new_note), 201
        else:
            print(f"❌ Errore nel salvare la nota")
            return jsonify({'error': 'Errore nel salvare'}), 500
    except Exception as e:
        print(f"❌ ECCEZIONE create_note: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    """Aggiorna una nota"""
    try:
        data = load_data()
        note_data = request.get_json()

        print(f"📥 PUT /api/notes/{note_id}")

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
                    print(f"✅ Nota aggiornata: {note_id}")
                    return jsonify(data['notes'][i])

        return jsonify({'error': 'Nota non trovata'}), 404
    except Exception as e:
        print(f"❌ Errore update_note: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Elimina una nota"""
    try:
        data = load_data()

        print(f"📥 DELETE /api/notes/{note_id}")

        original_length = len(data['notes'])
        data['notes'] = [note for note in data['notes'] if note['id'] != note_id]

        if len(data['notes']) < original_length:
            if save_data(data):
                print(f"✅ Nota eliminata: {note_id}")
                return jsonify({'message': 'Eliminata'})

        return jsonify({'error': 'Non trovata'}), 404
    except Exception as e:
        print(f"❌ Errore delete_note: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/search', methods=['GET'])
def search_notes():
    """Cerca nelle note"""
    query = request.args.get('q', '').lower()

    if not query:
        return jsonify([])

    data = load_data()
    results = []

    for note in data['notes']:
        if (query in note['title'].lower() or 
            query in note['content'].lower() or 
            any(query in tag.lower() for tag in note['tags'])):
            results.append(note)

    print(f"✅ Ricerca '{query}': {len(results)} risultati")
    return jsonify(results)

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Server PARA Notes")
    print("="*60)
    print(f"📁 Cartella di lavoro: {os.getcwd()}")
    print(f"📄 File dati: {os.path.abspath(DATA_FILE)}")

    # Verifica permessi scrittura
    if os.access('.', os.W_OK):
        print("✅ Permessi scrittura: OK")
    else:
        print("❌ ERRORE: Nessun permesso di scrittura!")
        sys.exit(1)

    # Crea file dati se non esiste
    if not os.path.exists(DATA_FILE):
        print(f"📝 Creazione file {DATA_FILE}...")
        initial_data = {'notes': [], 'categories': ['Progetti', 'Aree', 'Risorse', 'Archivi']}
        if save_data(initial_data):
            print(f"✅ File {DATA_FILE} creato con successo!")
        else:
            print(f"❌ ERRORE: Impossibile creare {DATA_FILE}")
            sys.exit(1)
    else:
        print(f"✅ File {DATA_FILE} già esistente")

    print("="*60)
    print("📍 Server disponibile su:")
    print("   - http://localhost:5000")
    print("   - http://0.0.0.0:5000")
    print("📝 Premi CTRL+C per fermare")
    print("="*60 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
