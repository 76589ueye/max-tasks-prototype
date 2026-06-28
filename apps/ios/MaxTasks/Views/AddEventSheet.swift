import SwiftUI

struct AddEventSheet: View {
    @Binding var isPresented: Bool
    let selectedDate: Date
    
    @State private var title = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var endDate = Date().addingTimeInterval(3600)
    @State private var isAllDay = false
    
    var body: some View {
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
                // Initialize times based on selected date
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
