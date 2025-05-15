const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const { VerifiedPermissionsClient, ListPoliciesCommand } = require("@aws-sdk/client-verifiedpermissions");
const { notebooksRepository } = require('./notebookRepository');
const verifyToken = require('./middleware/authMiddleware');

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

// Apply the JWT verification middleware to protected routes
app.use(verifyToken);

app.get('/notebooks', (req, res) => {
    const principalSub = req.user.sub; // Use the sub from the verified JWT
    console.log(req.user);
    const notebooks = notebooksRepository.findByOwner(principalSub);
    res.json(notebooks);
});

app.post('/notebooks', (req, res) => {
    const principalSub = req.user.sub; // Use the sub from the verified JWT
    const id = Date.now().toString();
    console.log('received body', req.body);
    const notebook = {
        id,
        name: req.body.name,
        owner: principalSub,
        content: req.body.content
    };
    notebooksRepository.saveNotebook(notebook);
    console.log(notebooksRepository.findById(id));
    res.status(201).json(notebook);
});

app.get('/notebooks/:id',
  function getNotebookById(req, res) {
    console.log(req.params);
    const notebook = notebooksRepository.findById(req.params.id);
    if (notebook) {
        res.json(notebook);
    } else {
        res.status(404).send('Notebook not found');
    }
});

app.put('/notebooks/:id', (req, res) => {
    const notebook = notebooksRepository.putNotebook(req.body);
    if (notebook) {
        res.json(notebook);
    } else {
        res.status(404).send('Notebook not found');
    }
});

app.delete('/notebooks/:id', (req, res) => {
    notebooksRepository.deleteNotebook(req.params.id);
});

// Configure AWS SDK v3
const verifiedPermissionsClient = new VerifiedPermissionsClient();

app.get('/notebooks/shared-with-me', async (req, res) => {
    try {
        const userId = req.user.sub; // Use the sub from the verified JWT

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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});