import SwiftUI

struct CalendarView: View {
    @State private var events: [CalendarEvent] = []
    @State private var selectedDate = Date()
    @State private var showAddEvent = false
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Graphical DatePicker
                DatePicker(
                    "Agenda Calendar",
                    selection: $selectedDate,
                    displayedComponents: [.date]
                )
                .datePickerStyle(.graphical)
                .padding()
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(12)
                .padding()
                
                // Agenda Events List
                List {
                    Section(header: Text("Agenda Events")) {
                        ForEach(filteredEvents) { event in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(event.title)
                                    .font(.headline)
                                if let desc = event.description, !desc.isEmpty {
                                    Text(desc)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                
                                HStack {
                                    Image(systemName: "clock")
                                        .font(.caption)
                                    Text(formatEventTime(event.startDate))
                                        .font(.caption)
                                    Spacer()
                                }
                                .foregroundColor(.secondary)
                                .padding(.top, 2)
                            }
                            .padding(.vertical, 4)
                        }
                        
                        if filteredEvents.isEmpty {
                            Text("No agenda entries scheduled.")
                                .foregroundColor(.secondary)
                                .font(.caption)
                                .padding()
                        }
                    }
                }
            }
            .navigationTitle("Calendar")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showAddEvent = true
                    } label: {
                        Image(systemName: "calendar.badge.plus")
                            .font(.body.weight(.medium))
                    }
                }
            }
            .sheet(isPresented: $showAddEvent) {
                AddEventSheet(isPresented: $showAddEvent, selectedDate: selectedDate)
            }
            .onAppear(perform: loadData)
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("local_cache_update")), perform: { _ in loadData() })
        }
    }
    
    private var filteredEvents: [CalendarEvent] {
        events.filter {
            let start = parseDate(dateStr: $0.startDate)
            return Calendar.current.isDate(start, inSameDayAs: selectedDate)
        }
    }
    
    private func loadData() {
        events = Persistence.shared.queryCalendarEvents()
    }
    
    private func parseDate(dateStr: String) -> Date {
        let formatter = ISO8601DateFormatter()
        return formatter.date(from: dateStr) ?? Date()
    }
    
    private func formatEventTime(_ dateStr: String) -> String {
        let date = parseDate(dateStr: dateStr)
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
