// Abstract base class for all note-related items
class NoteItem {
  constructor(id, title, createdAt) {
      if (this.constructor === NoteItem) {
          throw new Error("Abstract class cannot be instantiated");
      }
      this.id = id || Date.now();
      this.title = title;
      this.createdAt = createdAt || new Date().toISOString();
  }

  render() {
      throw new Error("Method 'render' must be implemented");
  }
}

// Main Note class that extends the base class
class Note extends NoteItem {
  constructor(id, title, content, color = "#ffffff", reminder = null, tags = [], image = null, checklist = []) {
      super(id, title);
      this.content = content;
      this.color = color;
      this.reminder = reminder;
      this.tags = tags;
      this.image = image;
      this.checklist = checklist;
  }

  render() {
      const div = document.createElement("div");
      div.className = NotesUI.isListView ? "note bg-white rounded-lg shadow p-4 mb-4" : "note bg-white rounded-lg shadow p-4";
      div.style.backgroundColor = this.color;

      const tagsHtml = this.tags ? this.tags.map(tag => 
          `<span class="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs font-semibold text-gray-700 mr-1">${tag}</span>`
      ).join("") : "";

      const checklistHtml = this.renderChecklist();

      div.innerHTML = `
          <h3 class="font-medium mb-2">${this.title}</h3>
          <p class="text-sm text-gray-700 mb-4">${this.content}</p>
          ${this.image ? `<img src="${this.image}" alt="Note image" class="mb-4 max-w-full h-auto">` : ""}
          ${checklistHtml}
          <div class="text-xs text-gray-500 mb-2">${tagsHtml}</div>
          ${this.reminder ? `<div class="text-xs text-gray-500 mb-2">Reminder: ${new Date(this.reminder).toLocaleString()}</div>` : ""}
          <div class="flex justify-between items-center">
              <span class="text-xs text-gray-500">${new Date(this.createdAt).toLocaleString()}</span>
              <div>
                  ${NotesUI.currentView !== "trash" ? `
                      <button onclick="notesManager.editNote(${this.id})" class="text-gray-600 hover:text-gray-800">
                          <i class="fas fa-edit"></i>
                      </button>
                      <button onclick="notesManager.archiveNote(${this.id})" class="text-gray-600 hover:text-gray-800 ml-2">
                          <i class="fas fa-archive"></i>
                      </button>
                  ` : ""}
                  <button onclick="${NotesUI.currentView === "trash" ? "notesManager.deleteNotePermanently" : "notesManager.deleteNote"}(${this.id})" 
                      class="text-gray-600 hover:text-gray-800 ml-2">
                      <i class="fas fa-trash"></i>
                  </button>
              </div>
          </div>
      `;
      return div;
  }

  renderChecklist() {
      if (!this.checklist || this.checklist.length === 0) return "";
      
      return `
          <div class="checklist-items mt-2 space-y-1">
              ${this.checklist.map(item => `
                  <div class="flex items-center space-x-2">
                      <input type="checkbox" 
                          class="form-checkbox h-4 w-4 text-yellow-500" 
                          ${item.checked ? "checked" : ""} 
                          onchange="notesManager.updateNoteChecklist(${this.id}, this)">
                      <span class="checklist-text" style="${item.checked ? "text-decoration: line-through; color: #9CA3AF;" : ""}">${item.text}</span>
                  </div>
              `).join("")}
          </div>
      `;
  }
}

// Interface for storage operations
class StorageInterface {
  save() { throw new Error("Method 'save' must be implemented"); }
  load() { throw new Error("Method 'load' must be implemented"); }
}

// Concrete implementation of local storage
class LocalStorage extends StorageInterface {
  constructor(key) {
      super();
      this.key = key;
  }

  save(data) {
      localStorage.setItem(this.key, JSON.stringify(data));
  }

  load() {
      const data = localStorage.getItem(this.key);
      return data ? JSON.parse(data) : null;
  }
}

// UI Manager class
class NotesUI {
  static isListView = false;
  static currentView = "notes";
  static currentNoteColor = "#ffffff";

  static colorOptions = [
      { name: "White", value: "#ffffff" },
      { name: "Red", value: "#f28b82" },
      { name: "Orange", value: "#fbbc04" },
      { name: "Yellow", value: "#fff475" },
      { name: "Green", value: "#ccff90" },
      { name: "Teal", value: "#a7ffeb" },
      { name: "Blue", value: "#cbf0f8" },
      { name: "Dark Blue", value: "#aecbfa" },
      { name: "Purple", value: "#d7aefb" },
      { name: "Pink", value: "#fdcfe8" }
  ];

  static toggleView() {
      this.isListView = !this.isListView;
      document.getElementById("view-toggle").className = this.isListView ? "fas fa-list" : "fas fa-th";
      notesManager.updateView();
  }

  static setNoteColor(color) {
      this.currentNoteColor = color;
      document.getElementById("note-input").style.backgroundColor = color;
  }

  static toggleColorPalette() {
      const palette = document.getElementById("color-palette");
      palette.innerHTML = "";
      this.colorOptions.forEach(color => {
          const colorButton = document.createElement("button");
          colorButton.className = "w-6 h-6 rounded-full";
          colorButton.style.backgroundColor = color.value;
          colorButton.onclick = () => this.setNoteColor(color.value);
          palette.appendChild(colorButton);
      });
      palette.classList.toggle("hidden");
  }

  static toggleReminder() {
      document.getElementById("reminder-options").classList.toggle("hidden");
  }

  static toggleTags() {
      document.getElementById("tag-options").classList.toggle("hidden");
  }

  static initColorPalette() {
      const palette = document.getElementById("color-palette");
      this.colorOptions.forEach(color => {
          const colorButton = document.createElement("button");
          colorButton.className = "w-6 h-6 rounded-full";
          colorButton.style.backgroundColor = color.value;
          colorButton.onclick = () => this.setNoteColor(color.value);
          palette.appendChild(colorButton);
      });
  }

  static initSearchFunctionality() {
      const searchInput = document.getElementById("search-input");
      searchInput.addEventListener("input", () => {
          const searchTerm = searchInput.value.toLowerCase();
          notesManager.filterNotes(searchTerm);
      });
  }
}

// Notes Manager class
class NotesManager {
  constructor() {
      this.notes = [];
      this.archivedNotes = [];
      this.trashedNotes = [];
      this.tags = [];
      
      this.notesStorage = new LocalStorage("cakit-notes");
      this.archivedStorage = new LocalStorage("cakit-archived-notes");
      this.trashedStorage = new LocalStorage("cakit-trashed-notes");
      this.tagsStorage = new LocalStorage("cakit-tags");
  }

  addNote() {
      const title = document.getElementById("note-title").value;
      const content = document.getElementById("note-content").value;
      const reminderDate = document.getElementById("reminder-datetime").value;

      if (title.trim() === "" && content.trim() === "" && 
          !document.querySelector("#checklist-items")?.children.length) return;

      const checklistItems = Array.from(document.querySelector("#checklist-items")?.children || [])
          .map(item => ({
              text: item.querySelector(".checklist-text").textContent,
              checked: item.querySelector(".checklist-checkbox").checked,
          }));

      const note = new Note(
          Date.now(),
          title,
          content,
          NotesUI.currentNoteColor,
          reminderDate ? new Date(reminderDate).toISOString() : null,
          [],
          document.querySelector("#note-input img")?.src || null,
          checklistItems
      );

      this.notes.unshift(note);
      this.updateView();
      this.saveNotes();
      this.clearNoteInput();
  }

  editNote(id) {
      const note = this.notes.find(n => n.id === id) || 
                  this.archivedNotes.find(n => n.id === id);
      if (note) {
          document.getElementById("note-title").value = note.title;
          document.getElementById("note-content").value = note.content;
          document.getElementById("reminder-datetime").value = 
              note.reminder ? new Date(note.reminder).toISOString().slice(0, 16) : "";
          NotesUI.setNoteColor(note.color);

          this.setupChecklistForEdit(note);
          this.setupImageForEdit(note);
          this.deleteNote(id);
      }
  }

  setupChecklistForEdit(note) {
      if (note.checklist && note.checklist.length > 0) {
          this.createChecklistContainer();
          const container = document.getElementById("checklist-container");
          container.classList.remove("hidden");
          const checklistItems = document.getElementById("checklist-items");
          checklistItems.innerHTML = "";

          note.checklist.forEach(item => {
              const itemDiv = document.createElement("div");
              itemDiv.className = "flex items-center space-x-2 p-2 bg-gray-50 rounded";
              itemDiv.innerHTML = `
                  <input type="checkbox" class="checklist-checkbox form-checkbox h-4 w-4 text-yellow-500" 
                      ${item.checked ? "checked" : ""} onchange="notesManager.toggleChecklistItem(this)">
                  <span class="checklist-text" style="${item.checked ? "text-decoration: line-through; color: #9CA3AF;" : ""}">${item.text}</span>
                  <button onclick="notesManager.deleteChecklistItem(this)" class="text-gray-500 hover:text-red-500">
                      <i class="fas fa-times"></i>
                  </button>
              `;
              checklistItems.appendChild(itemDiv);
          });
      }
  }

  setupImageForEdit(note) {
      if (note.image) {
          const noteInput = document.getElementById("note-input");
          noteInput.innerHTML += `<img src="${note.image}" alt="Note image" class="mt-2 max-w-full h-auto">`;
      }
  }

  deleteNote(id) {
      const noteIndex = this.notes.findIndex(n => n.id === id);
      if (noteIndex !== -1) {
          this.trashedNotes.unshift(this.notes.splice(noteIndex, 1)[0]);
      } else {
          const archivedIndex = this.archivedNotes.findIndex(n => n.id === id);
          if (archivedIndex !== -1) {
              this.trashedNotes.unshift(this.archivedNotes.splice(archivedIndex, 1)[0]);
          }
      }
      this.updateView();
      this.saveAllData();
  }

  deleteNotePermanently(id) {
      this.trashedNotes = this.trashedNotes.filter(note => note.id !== id);
      this.updateView();
      this.saveTrashedNotes();
  }

  archiveNote(id) {
      const noteIndex = this.notes.findIndex(n => n.id === id);
      if (noteIndex !== -1) {
          this.archivedNotes.unshift(this.notes.splice(noteIndex, 1)[0]);
          this.updateView();
          this.saveAllData();
      }
  }

  updateNoteChecklist(noteId, checkbox) {
      const note = this.notes.find(n => n.id === noteId);
      if (note) {
          const textElement = checkbox.nextElementSibling;
          const itemText = textElement.textContent;
          const itemIndex = note.checklist.findIndex(item => item.text === itemText);

          if (itemIndex !== -1) {
              note.checklist[itemIndex].checked = checkbox.checked;
              if (checkbox.checked) {
                  textElement.style.textDecoration = "line-through";
                  textElement.style.color = "#9CA3AF";
              } else {
                  textElement.style.textDecoration = "none";
                  textElement.style.color = "inherit";
              }
              this.saveNotes();
          }
      }
  }

  addTag() {
      const tagInput = document.getElementById("tag-input");
      const newTag = tagInput.value.trim();
      if (newTag && !this.tags.includes(newTag)) {
          this.tags.push(newTag);
          tagInput.value = "";
          this.saveTags();
          if (NotesUI.currentView === "tags") {
              this.renderTags();
          }
      }
  }

  deleteTag(tag) {
      this.tags = this.tags.filter(t => t !== tag);
      this.notes.forEach(note => {
          if (note.tags) {
              note.tags = note.tags.filter(t => t !== tag);
          }
      });
      this.saveTags();
      this.saveNotes();
      if (NotesUI.currentView === "tags") {
          this.renderTags();
      }
  }

  createChecklistContainer() {
      const noteInput = document.getElementById("note-input");
      if (!document.getElementById("checklist-container")) {
          const container = document.createElement("div");
          container.id = "checklist-container";
          container.className = "hidden mt-2";
          container.innerHTML = `
              <div id="checklist-input-group" class="flex items-center mb-2">
                  <input type="text" id="checklist-input" 
                      class="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500" 
                      placeholder="Add checklist item">
                  <button onclick="notesManager.addChecklistItem()" 
                      class="ml-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                      Add Item
                  </button>
              </div>
              <div id="checklist-items" class="space-y-2"></div>
          `;
          noteInput.appendChild(container);
      }
  }

  toggleChecklist() {
      const container = document.getElementById("checklist-container");
      if (!container) {
          this.createChecklistContainer();
          document.getElementById("checklist-container").classList.remove("hidden");
      } else {
          container.classList.toggle("hidden");
      }
  }

  addChecklistItem() {
      const input = document.getElementById("checklist-input");
      const text = input.value.trim();
      if (text) {
          const checklistItems = document.getElementById("checklist-items");
          const itemDiv = document.createElement("div");
          itemDiv.className = "flex items-center space-x-2 p-2 bg-gray-50 rounded";
          itemDiv.innerHTML = `
              <input type="checkbox" class="checklist-checkbox form-checkbox h-4 w-4 text-yellow-500" 
                  onchange="notesManager.toggleChecklistItem(this)">
              <span class="checklist-text">${text}</span>
              <button onclick="notesManager.deleteChecklistItem(this)" class="text-gray-500 hover:text-red-500">
                  <i class="fas fa-times"></i>
              </button>
          `;
          checklistItems.appendChild(itemDiv);
          input.value = "";
      }
  }

  toggleChecklistItem(checkbox) {
      const textElement = checkbox.nextElementSibling;
      if (checkbox.checked) {
          textElement.style.textDecoration = "line-through";
          textElement.style.color = "#9CA3AF";
      } else {
          textElement.style.textDecoration = "none";
          textElement.style.color = "inherit";
      }
  }

  deleteChecklistItem(button) {
      button.closest("div").remove();
  }

  clearNoteInput() {
      document.getElementById("note-title").value = "";
      document.getElementById("note-content").value = "";
      document.getElementById("reminder-datetime").value = "";
      document.getElementById("tag-input").value = "";
      NotesUI.setNoteColor("#ffffff");
      
      const checklistContainer = document.getElementById("checklist-container");
      if (checklistContainer) {
          checklistContainer.classList.add("hidden");
          document.getElementById("checklist-items").innerHTML = "";
      }
      
      const noteInput = document.getElementById("note-input");
      const image = noteInput.querySelector("img");
      if (image) {
          image.remove();
      }
  }

  filterNotes(searchTerm) {
      const notes = this.getCurrentNotes();
      const filteredNotes = notes.filter(note => 
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm) ||
          (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
      this.renderNotes(filteredNotes);
  }

  getCurrentNotes() {
      switch (NotesUI.currentView) {
          case "notes":
              return this.notes;
          case "archive":
              return this.archivedNotes;
          case "trash":
              return this.trashedNotes;
          default:
              return this.notes;
      }
  }

  updateView() {
      const notes = this.getCurrentNotes();
      this.renderNotes(notes);
  }

  renderNotes(notes) {
      const container = document.getElementById("notes-container");
      container.innerHTML = "";
      const gridClass = NotesUI.isListView ? "" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
      container.className = gridClass;
      
      if (notes.length === 0) {
          container.innerHTML = `
              <div class="text-center text-gray-500 py-8">
                  No notes found. Start creating your first note!
              </div>
          `;
          return;
      }

      notes.forEach(note => {
          container.appendChild(note.render());
      });
  }

  renderTags() {
      const container = document.getElementById("notes-container");
      container.innerHTML = "";
      container.className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";

      this.tags.forEach(tag => {
          const tagElement = document.createElement("div");
          tagElement.className = "bg-white rounded-lg shadow p-4";
          tagElement.innerHTML = `
              <div class="flex justify-between items-center">
                  <span class="text-lg font-medium">${tag}</span>
                  <button onclick="notesManager.deleteTag('${tag}')" class="text-gray-600 hover:text-red-500">
                      <i class="fas fa-times"></i>
                  </button>
              </div>
              <div class="text-sm text-gray-500 mt-2">
                  ${this.notes.filter(note => note.tags.includes(tag)).length} notes
              </div>
          `;
          container.appendChild(tagElement);
      });
  }

  saveAllData() {
      this.saveNotes();
      this.saveArchivedNotes();
      this.saveTrashedNotes();
      this.saveTags();
  }

  saveNotes() {
      this.notesStorage.save(this.notes);
  }

  saveArchivedNotes() {
      this.archivedStorage.save(this.archivedNotes);
  }

  saveTrashedNotes() {
      this.trashedStorage.save(this.trashedNotes);
  }

  saveTags() {
      this.tagsStorage.save(this.tags);
  }

  loadAllData() {
      this.loadNotes();
      this.loadArchivedNotes();
      this.loadTrashedNotes();
      this.loadTags();
      this.updateView();
  }

  loadNotes() {
      const savedNotes = this.notesStorage.load();
      if (savedNotes) {
          this.notes = savedNotes.map(note => Object.assign(new Note(), note));
      }
  }

  loadArchivedNotes() {
      const savedArchived = this.archivedStorage.load();
      if (savedArchived) {
          this.archivedNotes = savedArchived.map(note => Object.assign(new Note(), note));
      }
  }

  loadTrashedNotes() {
      const savedTrashed = this.trashedStorage.load();
      if (savedTrashed) {
          this.trashedNotes = savedTrashed.map(note => Object.assign(new Note(), note));
      }
  }

  loadTags() {
      const savedTags = this.tagsStorage.load();
      if (savedTags) {
          this.tags = savedTags;
      }
  }

  init() {
      this.loadAllData();
      NotesUI.initColorPalette();
      NotesUI.initSearchFunctionality();
  }
}

// Initialize the application
const notesManager = new NotesManager();
document.addEventListener("DOMContentLoaded", () => {
  notesManager.init();
});
