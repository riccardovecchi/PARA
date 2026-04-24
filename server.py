#!/usr/bin/env python3
from flask import Flask, request, jsonify, send_from_directory
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)

DATA_FILE = 'notes_data.json'

def init_data_file():
    """Inizializza il file dati se non esiste"""
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump({'notes': []}, f)
        print(f"✅ Creato {DATA_FILE}")

def load_data():
    """Carica dati dal JSON"""
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {'notes': []}

def save_data(data):
    """Salva dati nel JSON"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.after_request
def add_cors_headers(response):
    """Aggiungi header CORS"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/notes', methods=['GET', 'OPTIONS'])
def get_notes():
    if request.method == 'OPTIONS':
        return '', 200
    data = load_data()
    return jsonify(data['notes'])

@app.route('/api/notes', methods=['POST', 'OPTIONS'])
def create_note():
    if request.method == 'OPTIONS':
        return '', 200

    data = load_data()
    note_data = request.json

    new_note = {
        'id': str(uuid.uuid4()),
        'title': note_data.get('title', 'Nuova Nota'),
        'content': note_data.get('content', ''),
        'category': note_data.get('category', 'Progetti'),
        'tags': note_data.get('tags', []),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }

    data['notes'].insert(0, new_note)
    save_data(data)

    print(f"✅ Nota creata: {new_note['title']}")
    return jsonify(new_note), 201

@app.route('/api/notes/<note_id>', methods=['PUT', 'OPTIONS'])
def update_note(note_id):
    if request.method == 'OPTIONS':
        return '', 200

    data = load_data()
    note_data = request.json

    for note in data['notes']:
        if note['id'] == note_id:
            note['title'] = note_data.get('title', note['title'])
            note['content'] = note_data.get('content', note['content'])
            note['category'] = note_data.get('category', note['category'])
            note['tags'] = note_data.get('tags', note['tags'])
            note['updated_at'] = datetime.now().isoformat()
            save_data(data)
            print(f"✅ Nota aggiornata: {note['title']}")
            return jsonify(note)

    return jsonify({'error': 'Nota non trovata'}), 404

@app.route('/api/notes/<note_id>', methods=['DELETE', 'OPTIONS'])
def delete_note(note_id):
    if request.method == 'OPTIONS':
        return '', 200

    data = load_data()
    data['notes'] = [n for n in data['notes'] if n['id'] != note_id]
    save_data(data)

    print(f"✅ Nota eliminata: {note_id}")
    return jsonify({'success': True})

@app.route('/api/search', methods=['GET'])
def search_notes():
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify([])

    data = load_data()
    results = [
        note for note in data['notes']
        if query in note['title'].lower() 
        or query in note['content'].lower()
        or any(query in tag.lower() for tag in note['tags'])
    ]

    return jsonify(results)

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 PARA Notes Server")
    print("="*60)
    print(f"📁 Cartella: {os.getcwd()}")

    init_data_file()

    print("📍 Apri: http://localhost:5000")
    print("📍 Rete: http://0.0.0.0:5000")
    print("="*60 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=True)
