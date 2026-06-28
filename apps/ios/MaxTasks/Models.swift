import Foundation
import SwiftUI

public struct User: Codable, Identifiable {
    public let id: String
    public let email: String
    public let name: String
}

public struct Workspace: Codable, Identifiable {
    public let id: String
    public let name: String
    public let ownerId: String
}

public struct Project: Codable, Identifiable, Hashable {
    public let id: String
    public var name: String
    public var description: String?
    public var icon: String?
    public var color: String?
    public var status: String
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, name: String, description: String? = nil, icon: String? = nil, color: String? = nil, status: String = "ON_TRACK", workspaceId: String, revision: Int = 1) {
        self.id = id
        self.name = name
        self.description = description
        self.icon = icon
        self.color = color
        self.status = status
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct Plan: Codable, Identifiable, Hashable {
    public let id: String
    public var title: String
    public var vision: String?
    public var type: String
    public var progress: Int
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, title: String, vision: String? = nil, type: String = "PERSONAL", progress: Int = 0, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.title = title
        self.vision = vision
        self.type = type
        self.progress = progress
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct Task: Codable, Identifiable, Hashable {
    public let id: String
    public var title: String
    public var description: String?
    public var status: String
    public var priority: String
    public var dueDate: String?
    public var timeOfDay: String?
    public var expectedDuration: Int?
    public var projectId: String?
    public var planId: String?
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, title: String, description: String? = nil, status: String = "INBOX", priority: String = "MEDIUM", dueDate: String? = nil, timeOfDay: String? = nil, expectedDuration: Int? = nil, projectId: String? = nil, planId: String? = nil, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.dueDate = dueDate
        self.timeOfDay = timeOfDay
        self.expectedDuration = expectedDuration
        self.projectId = projectId
        self.planId = planId
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct Note: Codable, Identifiable, Hashable {
    public let id: String
    public var title: String
    public var content: String
    public var isPinned: Bool
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, title: String, content: String = "", isPinned: Bool = false, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.title = title
        self.content = content
        self.isPinned = isPinned
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct CalendarEvent: Codable, Identifiable, Hashable {
    public let id: String
    public var title: String
    public var description: String?
    public var startDate: String
    public var endDate: String
    public var isAllDay: Bool
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, title: String, description: String? = nil, startDate: String, endDate: String, isAllDay: Bool, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.title = title
        self.description = description
        self.startDate = startDate
        self.endDate = endDate
        self.isAllDay = isAllDay
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct Habit: Codable, Identifiable, Hashable {
    public let id: String
    public var name: String
    public var frequency: String
    public var streak: Int
    public let workspaceId: String
    public var revision: Int
    
    public init(id: String, name: String, frequency: String, streak: Int = 0, workspaceId: String, revision: Int = 1) {
        self.id = id
        self.name = name
        self.frequency = frequency
        self.streak = streak
        self.workspaceId = workspaceId
        self.revision = revision
    }
}

public struct HabitLog: Codable, Identifiable, Hashable {
    public let id: String
    public let habitId: String
    public let date: String
    public let completed: Bool
}

public struct SyncMutation: Codable {
    public let type: String
    public let table: String
    public let entityId: String
    public let clientTimestamp: Int64
    public let data: [String: String]?
}

// SwiftUI Quick Add Task Sheet
public struct QuickAddSheet: View {
    @Binding var isPresented: Bool
    let workspaceId: String
    
    @State private var title = ""
    @State private var description = ""
    @State private var priority = "MEDIUM"
    @State private var durationString = ""
    @State private var useDueDate = false
    @State private var dueDate = Date()
    
    let priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    
    public init(isPresented: Binding<Bool>, workspaceId: String) {
        self._isPresented = isPresented
        self.workspaceId = workspaceId
    }
    
    public var body: some View {
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

// SwiftUI Add Calendar Event Sheet
public struct AddEventSheet: View {
    @Binding var isPresented: Bool
    let selectedDate: Date
    
    @State private var title = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var endDate = Date().addingTimeInterval(3600)
    @State private var isAllDay = false
    
    public init(isPresented: Binding<Bool>, selectedDate: Date) {
        self._isPresented = isPresented
        self.selectedDate = selectedDate
    }
    
    public var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Event Details")) {
                    TextField("Title", text: $title)
                    TextField("Description (Optional)", text: $description)
                }
                
                Section(header: Text("Time")) {
                    Toggle("All Day", isOn: $isAllDay)
                    
                    DatePicker("Start Time", selection: $startDate, displayedComponents: isAllDay ? [.date] : [.date, .hourAndMinute])
                    DatePicker("End Time", selection: $endDate, displayedComponents: isAllDay ? [.date] : [.date, .hourAndMinute])
                }
            }
            .navigationTitle("New Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveEvent()
                        isPresented = false
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                startDate = selectedDate
                endDate = selectedDate.addingTimeInterval(3600)
            }
        }
    }
    
    private func saveEvent() {
        let formatter = ISO8601DateFormatter()
        let workspaceId = UserDefaults.standard.string(forKey: "max_tasks_workspace_id") ?? ""
        
        let newEvent = CalendarEvent(
            id: UUID().uuidString,
            title: title,
            description: description.isEmpty ? nil : description,
            startDate: formatter.string(from: startDate),
            endDate: formatter.string(from: endDate),
            isAllDay: isAllDay,
            workspaceId: workspaceId
        )
        
        Persistence.shared.saveCalendarEvent(newEvent)
        NotificationCenter.default.post(name: NSNotification.Name("local_cache_update"), object: nil)
    }
}
