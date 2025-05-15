const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;
const { VerifiedPermissionsClient, ListPoliciesCommand } = require("@aws-sdk/client-verifiedpermissions");
const { notebooksRepository } = require('./nodebookrepository');

app.use(bodyParser.json());

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

// Notebooks endpoints
app.get('/notebooks', (req, res) => {
    const principalSub = (res.locals.authorizerInfo?.principalUid?.id || '').split('|')[1];
    console.log('keys in req', Object.keys(req));
    console.log('authorizerInfo in res', res.locals.authorizerInfo);
    console.log('principalSub', principalSub);
    const notebooks = notebooksRepository.findByOwner(principalSub);
    res.json(notebooks);
});

app.post('/notebooks', (req, res) => {
    const principalSub = (req.authorizerInfo?.principal?.id || '').split('|')[1];
    const notebook = {
        id: Date.now().toString(),
        name: req.body.name,
        owner: principalSub,
        content: req.body.content
    };
    notebooksRepository.saveNotebook(notebook);
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


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

