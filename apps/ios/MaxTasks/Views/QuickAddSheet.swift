import SwiftUI

struct QuickAddSheet: View {
    @Binding var isPresented: Bool
    let workspaceId: String
    
    @State private var title = ""
    @State private var description = ""
    @State private var priority = "MEDIUM"
    @State private var durationString = ""
    @State private var useDueDate = false
    @State private var dueDate = Date()
    
    let priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Task Details")) {
                    TextField("Title", text: $title)
                    TextField("Description (Optional)", text: $description)
                }
                
                Section(header: Text("Attributes")) {
                    Picker("Priority", selection: $priority) {
                        ForEach(priorities, id: \.self) { p in
                            Text(p.capitalized).tag(p)
                        }
                    }
                    .pickerStyle(.segmented)
                    
                    TextField("Expected Duration (minutes)", text: $durationString)
                        .keyboardType(.numberPad)
                }
                
                Section(header: Text("Schedule")) {
                    Toggle("Set Due Date", isOn: $useDueDate)
                    if useDueDate {
                        DatePicker("Due Date", selection: $dueDate, displayedComponents: [.date, .hourAndMinute])
                    }
                }
            }
            .navigationTitle("New Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        saveTask()
                        isPresented = false
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
    
    private func saveTask() {
        let formatter = ISO8601DateFormatter()
        let dueDateString = useDueDate ? formatter.string(from: dueDate) : nil
        let duration = Int(durationString)
        
        let newTask = Task(
            id: UUID().uuidString,
            title: title,
            description: description.isEmpty ? nil : description,
            status: "INBOX",
            priority: priority,
            dueDate: dueDateString,
            expectedDuration: duration,
            workspaceId: workspaceId
        )
        
        Persistence.shared.saveTask(newTask)
        NotificationCenter.default.post(name: NSNotification.Name("local_cache_update"), object: nil)
    }
}
