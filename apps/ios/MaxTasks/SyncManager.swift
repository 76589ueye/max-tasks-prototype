import Foundation

public class SyncManager {
    public static let shared = SyncManager()
    private let apiURL = "http://localhost:8080/api/v1/sync"
    private var isSyncing = false
    private var webSocketTask: URLSessionWebSocketTask?
    private var isWsListening = false

    private init() {}

    public func initRealtimeWebSocket() {
        guard !isWsListening else { return }
        guard let token = KeychainHelper.shared.read(forKey: "max_tasks_token") else { return }
        guard let url = URL(string: "ws://localhost:8080?token=\(token)") else { return }
        
        let session = URLSession(configuration: .default)
        webSocketTask = session.webSocketTask(with: url)
        webSocketTask?.resume()
        isWsListening = true
        
        listenForWebSocketMessages()
    }
    
    private func listenForWebSocketMessages() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .failure(let error):
                print("WS connection error: \(error)")
                self?.isWsListening = false
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                    self?.initRealtimeWebSocket()
                }
            case .success(let message):
                switch message {
                case .string(let text):
                    if text.contains("reconcile") {
                        self?.sync()
                    }
                default:
                    break
                }
                self?.listenForWebSocketMessages()
            }
        }
    }

    public func sync() {
        guard !isSyncing else { return }
        
        // 1. Read token securely from Keychain
        guard let token = KeychainHelper.shared.read(forKey: "max_tasks_token") else { return }
        
        // Connect WebSocket for real-time push updates
        initRealtimeWebSocket()
        
        isSyncing = true
        
        // 2. Fetch mutations queue from SQLite table
        let queue = Persistence.shared.querySyncQueue()
        let lastSyncTimestamp = UserDefaults.standard.double(forKey: "last_sync_timestamp")
        
        // Prepare sync payload
        var requestData: [String: Any] = [
            "lastSyncTimestamp": lastSyncTimestamp,
        ]
        
        let dictMutations = queue.map { mutation -> [String: Any] in
            var dict: [String: Any] = [
                "type": mutation.type,
                "table": mutation.table,
                "entityId": mutation.entityId,
                "clientTimestamp": mutation.clientTimestamp
            ]
            if let data = mutation.data {
                dict["data"] = data
            }
            return dict
        }
        requestData["mutations"] = dictMutations
        
        guard let url = URL(string: apiURL) else {
            isSyncing = false
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: requestData, options: [])
        } catch {
            isSyncing = false
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            defer { self.isSyncing = false }
            
            guard error == nil, let data = data else { return }
            
            if let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
               let serverTimestamp = json["serverTimestamp"] as? Double,
               let updatedEntities = json["updatedEntities"] as? [String: [[String: Any]]],
               let deletedIds = json["deletedIds"] as? [String: [String]] {
                
                // Clear SQLite queue table
                Persistence.shared.clearSyncQueue()
                UserDefaults.standard.set(serverTimestamp, forKey: "last_sync_timestamp")
                
                // Reconcile and save updated items to SQLite
                self.mergeTable(table: "tasks", type: Task.self, updated: updatedEntities["tasks"], deleted: deletedIds["tasks"]) { item in
                    Persistence.shared.saveTask(item)
                }
                self.mergeTable(table: "projects", type: Project.self, updated: updatedEntities["projects"], deleted: deletedIds["projects"]) { item in
                    Persistence.shared.saveProject(item)
                }
                self.mergeTable(table: "plans", type: Plan.self, updated: updatedEntities["plans"], deleted: deletedIds["plans"]) { item in
                    Persistence.shared.savePlan(item)
                }
                self.mergeTable(table: "notes", type: Note.self, updated: updatedEntities["notes"], deleted: deletedIds["notes"]) { item in
                    Persistence.shared.saveNote(item)
                }
                self.mergeTable(table: "habits", type: Habit.self, updated: updatedEntities["habits"], deleted: deletedIds["habits"]) { item in
                    Persistence.shared.saveHabit(item)
                }
                self.mergeTable(table: "calendarEvents", type: CalendarEvent.self, updated: updatedEntities["calendarEvents"], deleted: deletedIds["calendarEvents"]) { item in
                    Persistence.shared.saveCalendarEvent(item)
                }
                
                // Refresh SwiftUI listeners
                DispatchQueue.main.async {
                    NotificationCenter.default.post(name: NSNotification.Name("local_cache_update"), object: nil)
                }
            }
        }.resume()
    }
    
    private func mergeTable<T: Codable & Identifiable>(
        table: String,
        type: T.Type,
        updated: [[String: Any]]?,
        deleted: [String]?,
        saveAction: (T) -> Void
    ) where T.ID == String {
        // Remove deleted items from SQLite
        if let deleted = deleted {
            for id in deleted {
                if table == "tasks" {
                    Persistence.shared.deleteTask(id: id)
                }
            }
        }
        
        // Write updated items to SQLite
        if let updated = updated {
            for dict in updated {
                if let data = try? JSONSerialization.data(withJSONObject: dict, options: []),
                   let parsedItem = try? JSONDecoder().decode(T.self, from: data) {
                    saveAction(parsedItem)
                }
            }
        }
    }
}
