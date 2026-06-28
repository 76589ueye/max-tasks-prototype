import SwiftUI

struct TodayView: View {
    @State private var tasks: [Task] = []
    @State private var events: [CalendarEvent] = []
    @State private var showQuickAdd = false
    
    var body: some View {
        NavigationStack {
            List {
                // Today Stats Progress Section
                Section {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Today's Progress")
                                .font(.headline)
                            Text("\(completedCount)/\(tasks.count) completed")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        
                        // Progress Icon with variable rendering
                        Image(systemName: "circle.dashed.inset.filled")
                            .font(.title)
                            .symbolRenderingMode(.hierarchical)
                            .foregroundColor(.accentColor)
                    }
                }
                
                // Overdue Section
                if !overdueTasks.isEmpty {
                    Section(header: Text("Overdue").foregroundColor(.red)) {
                        ForEach(overdueTasks) { task in
                            TaskRow(task: task, onToggle: toggleComplete)
                                .swipeActions(edge: .trailing) {
                                    Button(role: .destructive) {
                                        deleteTask(task.id)
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                        }
                    }
                }
                
                // Today Tasks Section
                Section(header: Text("Today's Objectives")) {
                    ForEach(todayTasks) { task in
                        TaskRow(task: task, onToggle: toggleComplete)
                            .swipeActions(edge: .leading) {
                                Button {
                                    toggleComplete(task)
                                } label: {
                                    Label(task.status == "COMPLETED" ? "Reopen" : "Complete", systemImage: "checkmark")
                                }
                                .tint(.green)
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    deleteTask(task.id)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                    }
                    
                    if todayTasks.isEmpty {
                        Text("No objectives set for today.")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                }
                
                // Timeline Schedule
                Section(header: Text("Timeline Schedule")) {
                    ForEach(7..<22) { hour in
                        let formattedHour = String(format: "%02d:00", hour)
                        let hourEvent = events.first(where: {
                            let startHour = Calendar.current.component(.hour, from: parseDate(dateStr: $0.startDate))
                            return startHour == hour
                        })
                        
                        HStack {
                            Text(formattedHour)
                                .font(.system(.caption, design: .monospace))
                                .foregroundColor(.secondary)
                                .frame(width: 48, alignment: .leading)
                            
                            if let event = hourEvent {
                                Text(event.title)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .padding(.vertical, 4)
                                    .padding(.horizontal, 8)
                                    .background(Color.accentColor.opacity(0.15))
                                    .cornerRadius(6)
                            } else {
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showQuickAdd = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.body.weight(.medium))
                    }
                }
            }
            .sheet(isPresented: $showQuickAdd) {
                QuickAddSheet(isPresented: $showQuickAdd, workspaceId: workspaceId)
            }
            .onAppear(perform: loadData)
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("local_cache_update")), perform: { _ in loadData() })
        }
    }
    
    private var workspaceId: String {
        return UserDefaults.standard.string(forKey: "max_tasks_workspace_id") ?? ""
    }
    
    private var completedCount: Int {
        tasks.filter { $0.status == "COMPLETED" }.count
    }
    
    private var overdueTasks: [Task] {
        tasks.filter {
            guard let dueStr = $0.dueDate else { return false }
            let due = parseDate(dateStr: dueStr)
            return due < Calendar.current.startOfDay(for: Date()) && $0.status != "COMPLETED"
        }
    }
    
    private var todayTasks: [Task] {
        tasks.filter {
            guard let dueStr = $0.dueDate else { return true } // Inbox
            let due = parseDate(dateStr: dueStr)
            return Calendar.current.isDate(due, inSameDayAs: Date())
        }
    }
    
    private func loadData() {
        tasks = Persistence.shared.queryTasks()
        events = Persistence.shared.queryCalendarEvents()
    }
    
    private func parseDate(dateStr: String) -> Date {
        let formatter = ISO8601DateFormatter()
        return formatter.date(from: dateStr) ?? Date()
    }
    
    private func toggleComplete(_ task: Task) {
        var updated = task
        updated.status = task.status == "COMPLETED" ? "IN_PROGRESS" : "COMPLETED"
        Persistence.shared.saveTask(updated)
        loadData()
    }
    
    private func deleteTask(_ id: String) {
        Persistence.shared.deleteTask(id: id)
        loadData()
    }
}

// Reusable Task Row System Styling
struct TaskRow: View {
    let task: Task
    let onToggle: (Task) -> Void
    
    var body: some View {
        HStack {
            Button {
                onToggle(task)
            } label: {
                Image(systemName: task.status == "COMPLETED" ? "checkmark.circle.fill" : "circle")
                    .font(.body.weight(.medium))
                    .foregroundColor(task.status == "COMPLETED" ? .green : .secondary)
            }
            .buttonStyle(PlainButtonStyle())
            
            Text(task.title)
                .font(.body)
                .strikethrough(task.status == "COMPLETED")
                .foregroundColor(task.status == "COMPLETED" ? .secondary : .primary)
            
            Spacer()
            
            if task.priority == "CRITICAL" || task.priority == "HIGH" {
                Image(systemName: "exclamationmark.circle.fill")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
        .contextMenu {
            Button {
                onToggle(task)
            } label: {
                Label(task.status == "COMPLETED" ? "Mark Active" : "Mark Completed", systemImage: "checkmark.circle")
            }
        }
    }
}
