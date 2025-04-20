const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.json());

// In-memory storage (replace with database in production)
let notebooks = [];
let weapons = [];

// Helper function to find a notebook by ID
function findNotebook(id) {
    return notebooks.find(notebook => notebook.id === id);
}

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// Notebooks endpoints
app.get('/notebooks', (req, res) => {
    res.json(notebooks);
});

app.post('/notebooks', (req, res) => {
    const notebook = { id: Date.now().toString(), name: req.body.name, notes: [] };
    notebooks.push(notebook);
    res.status(201).json(notebook);
});

app.get('/notebooks/:id', (req, res) => {
    const notebook = findNotebook(req.params.id);
    if (notebook) {
        res.json(notebook);
    } else {
        res.status(404).send('Notebook not found');
    }
});

app.put('/notebooks/:id', (req, res) => {
    const notebook = findNotebook(req.params.id);
    if (notebook) {
        notebook.name = req.body.name;
        res.json(notebook);
    } else {
        res.status(404).send('Notebook not found');
    }
});

app.delete('/notebooks/:id', (req, res) => {
    const index = notebooks.findIndex(notebook => notebook.id === req.params.id);
    if (index !== -1) {
        notebooks.splice(index, 1);
        res.status(204).send();
    } else {
        res.status(404).send('Notebook not found');
    }
});

// Notes endpoints (nested under notebooks)
app.get('/notebooks/:notebookId/notes', (req, res) => {
    const notebook = findNotebook(req.params.notebookId);
    if (notebook) {
        res.json(notebook.notes);
    } else {
        res.status(404).send('Notebook not found');
    }
});

app.post('/notebooks/:notebookId/notes', (req, res) => {
    const notebook = findNotebook(req.params.notebookId);
    if (notebook) {
        const note = { id: Date.now().toString(), content: req.body.content };
        notebook.notes.push(note);
        res.status(201).json(note);
    } else {
        res.status(404).send('Notebook not found');
    }
});

app.get('/notebooks/:notebookId/notes/:noteId', (req, res) => {
    const notebook = findNotebook(req.params.notebookId);
    if (notebook) {
        const note = notebook.notes.find(note => note.id === req.params.noteId);
        if (note) {
            res.json(note);
        } else {
            res.status(404).send('Note not found');
        }
    } else {
        res.status(404).send('Notebook not found');
    }
});

app.put('/notebooks/:notebookId/notes/:noteId', (req, res) => {
    const notebook = findNotebook(req.params.notebookId);
    if (notebook) {
        const note = notebook.notes.find(note => note.id === req.params.noteId);
        if (note) {
            note.content = req.body.content;
            res.json(note);
        } else {
            res.status(404).send('Note not found');
        }
    } else {
        res.status(404).send('Notebook not found');
    }
});

app.delete('/notebooks/:notebookId/notes/:noteId', (req, res) => {
    const notebook = findNotebook(req.params.notebookId);
    if (notebook) {
        const index = notebook.notes.findIndex(note => note.id === req.params.noteId);
        if (index !== -1) {
            notebook.notes.splice(index, 1);
            res.status(204).send();
        } else {
            res.status(404).send('Note not found');
        }
    } else {
        res.status(404).send('Notebook not found');
    }
});

app.get('/notebooks/sharedWithMe', (req, res) => {
    
});


const { listEndpointsHandler } = require('authmiddleware');

if (process.env.NODE_ENV === 'AVP_AUTH_MIDDLEWARE') {
    app.get('/list-endpoints', listEndpointsHandler);
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;