let notebooks = [
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
    content: '@@@ Personal JournalPersonal JournalPersonal JournalPersonal JournalPersonal Journal'
  },
  {
    id: '3',
    name: 'Recipe Collection',
    owner: '81d58348-a380-4ee9-a864-4d3d62915307',
    content: 'Recipe CollectionRecipe CollectionRecipe CollectionRecipe CollectionRecipe CollectionRecipe Collection'
  },
  {
    id: '4',
    name: 'Travel Plans',
    owner: '81d58348-a380-4ee9-a864-4d3d62915307',
    content: 'EuropeEuropeEuropeEuropeEuropeEuropeEurope'
  },
  {
    id: '5',
    name: 'Study Notes',
    owner: 'b5e2612d-4eb7-4265-b4b5-4c845a2825f7',
    content: 'formal verification, must, tla+'
  }
];

class NotebooksRepository {
    findByOwner(ownerId) {
        return notebooks.filter(notebook => notebook.owner === ownerId)
    }
    saveNotebook(notebook) {
        notebooks.push(notebook);
    }
    findById(notebookId) {
        return notebooks.find(notebook => notebook.id === notebookId);
    }
    putNotebook(notebook) {
        const notebookId = notebook.id;
        const n = notebooks.find(notebook => notebook.id === notebookId);
        if (!n) {
          return null;
        }
        n.name = notebook.name;
        n.content = notebook.content;
        return n;
    }
    deleteNotebook(notebookId) {
      notebooks = notebooks.filter(n => n.id !== notebookId);
    }
}

module.exports = {
  notebooksRepository: new NotebooksRepository(),
};
