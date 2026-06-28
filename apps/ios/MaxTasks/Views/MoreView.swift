import SwiftUI

struct MoreView: View {
    @State private var syncStatusText = "Reconciled"
    @State private var lastSyncTime = ""
    
    var body: some View {
        NavigationStack {
            List {
                Section(header: Text("Productivity Modules")) {
                    NavigationLink(destination: NotesListView()) {
                        Label("Notes & Documents", systemImage: "note.text")
                            .symbolRenderingMode(.hierarchical)
                    }
                    
                    NavigationLink(destination: ProjectsListView()) {
                        Label("Projects Boards", systemImage: "folder")
                            .symbolRenderingMode(.hierarchical)
                    }
                    
                    NavigationLink(destination: HabitsListView()) {
                        Label("Habits Tracker", systemImage: "chart.bar")
                            .symbolRenderingMode(.hierarchical)
                    }
                }
                
                Section(header: Text("Synchronization Logs")) {
                    HStack {
                        Text("Status")
                        Spacer()
                        Text(syncStatusText)
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Last Sync")
                        Spacer()
                        Text(lastSyncTime)
                            .foregroundColor(.secondary)
                    }
                    Button(action: triggerManualSync) {
                        Label("Force Sync Now", systemImage: "arrow.triangle.2.circlepath")
                    }
                }
                
                Section(header: Text("Access Settings")) {
                    Button(role: .destructive, action: handleLogout) {
                        Label("Log Out Workspace", systemImage: "arrow.right.to.line")
                    }
                }
            }
            .navigationTitle("More Options")
            .onAppear(perform: loadSyncData)
        }
    }
    
    private func loadSyncData() {
        let last = UserDefaults.standard.double(forKey: "last_sync_timestamp")
        if last > 0 {
            let date = Date(timeIntervalSince1970: last / 1000)
            let formatter = DateFormatter()
            formatter.timeStyle = .short
            formatter.dateStyle = .short
            lastSyncTime = formatter.string(from: date)
        } else {
            lastSyncTime = "Never Synced"
        }
    }
    
    private func triggerManualSync() {
        syncStatusText = "Synchronizing..."
        SyncManager.shared.sync()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            loadSyncData()
            syncStatusText = "Synced"
        }
    }
    
    private func handleLogout() {
        KeychainHelper.shared.delete(forKey: "max_tasks_token")
        UserDefaults.standard.removeObject(forKey: "max_tasks_workspace_id")
        UserDefaults.standard.removeObject(forKey: "max_tasks_user")
        UserDefaults.standard.removeObject(forKey: "last_sync_timestamp")
        
        NotificationCenter.default.post(name: NSNotification.Name("auth_change"), object: nil)
    }
}

// Subview: Notes List (Apple Notes native style)
struct NotesListView: View {
    @State private var notes: [Note] = []
    
    var body: some View {
        List {
            Section(header: Text("Pinned Documents")) {
                ForEach(notes.filter { $0.isPinned }) { note in
                    NavigationLink(destination: NoteEditorView(note: note)) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(note.title)
                                .fontWeight(.bold)
                            Text(note.content.prefix(40))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            
            Section(header: Text("Recent Documents")) {
                ForEach(notes.filter { !$0.isPinned }) { note in
                    NavigationLink(destination: NoteEditorView(note: note)) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(note.title)
                                .fontWeight(.medium)
                            Text(note.content.prefix(40))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Notes")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: createNote) {
                    Image(systemName: "note.text.badge.plus")
                }
            }
        }
        .onAppear(perform: loadCache)
    }
    
    private func loadCache() {
        notes = Persistence.shared.queryNotes()
    }
    
    private func createNote() {
        let newId = UUID().uuidString
        let workspaceId = UserDefaults.standard.string(forKey: "max_tasks_workspace_id") ?? ""
        let newNote = Note(id: newId, title: "New Document", content: "# Untitled Document\nWrite text here...", isPinned: false, workspaceId: workspaceId)
        
        Persistence.shared.saveNote(newNote)
        loadCache()
    }
}

// Subview: Note Editor Canvas
struct NoteEditorView: View {
    @State var note: Note
    
    var body: some View {
        Form {
            Section(header: Text("Note Information")) {
                TextField("Title", text: $note.title, onCommit: saveNote)
                    .fontWeight(.bold)
            }
            
            Section(header: Text("Note Content")) {
                TextEditor(text: $note.content)
                    .frame(minHeight: 280)
                    .onChange(of: note.content) { _ in
                        saveNote()
                    }
            }
        }
        .navigationTitle("Edit note")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    note.isPinned.toggle()
                    saveNote()
                } label: {
                    Image(systemName: note.isPinned ? "pin.fill" : "pin")
                        .foregroundColor(note.isPinned ? .accentColor : .secondary)
                }
            }
        }
    }
    
    private func saveNote() {
        Persistence.shared.saveNote(note)
    }
}

// Subview: Projects List
struct ProjectsListView: View {
    @State private var projects: [Project] = []
    
    var body: some View {
        List {
            Section(header: Text("Active Projects")) {
                ForEach(projects) { project in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(project.icon ?? "📁")
                                Text(project.name)
                                    .fontWeight(.bold)
                            }
                            if let desc = project.description, !desc.isEmpty {
                                Text(desc)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        Spacer()
                        Text(project.status)
                            .font(.system(size: 10, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.accentColor.opacity(0.1))
                            .cornerRadius(4)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Projects")
        .onAppear(perform: loadCache)
    }
    
    private func loadCache() {
        projects = Persistence.shared.queryProjects()
    }
}

// Subview: Habits List
struct HabitsListView: View {
    @State private var habits: [Habit] = []
    
    var body: some View {
        List {
            Section(header: Text("Habit Streaks")) {
                ForEach(habits) { habit in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(habit.name)
                                .fontWeight(.bold)
                            HStack(spacing: 2) {
                                Image(systemName: "flame.fill")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                                Text("\(habit.streak) Day Streak")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                            }
                        }
                        Spacer()
                        Button(action: { logHabit(habit) }) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.title3)
                                .foregroundColor(.green)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Habits")
        .onAppear(perform: loadCache)
    }
    
    private func loadCache() {
        habits = Persistence.shared.queryHabits()
    }
    
    private func logHabit(_ habit: Habit) {
        var updated = habit
        updated.streak += 1
        Persistence.shared.saveHabit(updated)
        loadCache()
    }
}
