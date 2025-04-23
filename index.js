const express = require('express');
const bodyParser = require('body-parser');
const { apAuthorizerMiddleware } = require('authmiddleware');
const app = express();
const port = 3000;
const { VerifiedPermissionsClient, ListPoliciesCommand } = require("@aws-sdk/client-verifiedpermissions");

app.use(bodyParser.json());

// In-memory storage (replace with database in production)
const notebooks = [
    {
        id: '1',
        name: 'Work Projects',
        owner: 'b5e2612d-4eb7-4265-b4b5-4c845a2825f7',
        content: 'Work ProjectsWork ProjectsWork ProjectsWork ProjectsWork ProjectsWork Projects'
    },
    {
        id: '2',
        name: 'Personal Journal',
        owner: 'b5e2612d-4eb7-4265-b4b5-4c845a2825f7',
        contents: '@@@ Personal JournalPersonal JournalPersonal JournalPersonal JournalPersonal Journal'
    },
    {
        id: '3',
        name: 'Recipe Collection',
        owner: '81d58348-a380-4ee9-a864-4d3d62915307',
        contents: 'Recipe CollectionRecipe CollectionRecipe CollectionRecipe CollectionRecipe CollectionRecipe Collection'
    },
    {
        id: '4',
        name: 'Travel Plans',
        owner: '81d58348-a380-4ee9-a864-4d3d62915307',
        contents: 'EuropeEuropeEuropeEuropeEuropeEuropeEurope'
    },
    {
        id: '5',
        name: 'Study Notes',
        owner: 'b5e2612d-4eb7-4265-b4b5-4c845a2825f7',
        contents: 'formal verification, must, tla+'
    }
];


// Helper function to find a notebook by ID
function findNotebook(id) {
    return notebooks.find(notebook => notebook.id === id);
}

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const allowedOrigin = 'http://localhost:5173'; // set this differently depending on env
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(apAuthorizerMiddleware({
    policyStoreId: 'Ns3X5naAK4NvTF9kdNHUEC',
    tokenType: 'identityToken',
    namespace: 'NotebooksApp',
    skippedEndpoints: [
        '/notebooks/shared-with-me',
        '/login',
        '/signup'
    ],
}));

// Notebooks endpoints
app.get('/notebooks', (req, res) => {
    const principalSub = (req.avpInfo?.principal?.entityId || '').split('|')[1];
    res.json(notebooks.filter(notebook => notebook.owner === principalSub));
});

app.post('/notebooks', (req, res) => {
    const principalSub = (req.avpInfo?.principal?.entityId || '').split('|')[1];
    const notebook = {
        id: Date.now().toString(),
        name: req.body.name,
        notes: []
    };
    notebooks.push(notebook);
    res.status(201).json(notebook);
});


app.get('/notebooks/:id', function getNotebookById(req, res) {
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

// Configure AWS SDK v3
const verifiedPermissionsClient = new VerifiedPermissionsClient();

app.get('/notebooks/shared-with-me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(500).send('Authorization header missing after auth middleware');
        }

        const token = authHeader.split(' ')[1];
        const payloadBase64 = token.split('.')[1];
        const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        const userId = payload.sub;

        const params = {
            policyStoreId: process.env.POLICY_STORE_ID,
            maxResults: 20,
            filter: {
                principal: {
                    identifier: {
                        entityType: 'NotebooksApp::User',
                        entityId: userId
                    }
                }
            }
        };

        const command = new ListPoliciesCommand(params);
        const response = await verifiedPermissionsClient.send(command);
        const resourceIds = response.policies.map(policy => policy.resource);

        res.json(resourceIds);
    } catch (error) {
        console.error('Error fetching shared notebooks:', error);
        res.status(500).send('Internal server error');
    }
});


const { listEndpointsHandler } = require('authmiddleware');

if (process.env.NODE_ENV === 'AVP_AUTH_MIDDLEWARE') {
    app.get('/list-endpoints', listEndpointsHandler);
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
