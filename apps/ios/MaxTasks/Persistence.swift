import Foundation
import SQLite3

public class Persistence {
    public static let shared = Persistence()
    private var db: OpaquePointer?

    private init() {
        openDatabase()
        createTables()
    }

    private func openDatabase() {
        let fileManager = FileManager.default
        guard let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first else {
            print("Failed to access document directory")
            return
        }
        let dbURL = documentsURL.appendingPathComponent("maxtasks.sqlite")
        
        if sqlite3_open(dbURL.path, &db) != SQLITE_OK {
            print("Failed to open SQLite database")
        }
    }

    private func createTables() {
        let createTasksTable = """
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            dueDate TEXT,
            timeOfDay TEXT,
            expectedDuration INTEGER,
            projectId TEXT,
            planId TEXT,
            workspaceId TEXT NOT NULL,
            revision INTEGER DEFAULT 1
        );
        """
        
        let createProjectsTable = """
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            color TEXT,
            status TEXT NOT NULL,
            workspaceId TEXT NOT NULL,
            revision INTEGER DEFAULT 1
        );
        """

        let createPlansTable = """
        CREATE TABLE IF NOT EXISTS plans (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            vision TEXT,
            type TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            workspaceId TEXT NOT NULL,
            revision INTEGER DEFAULT 1
        );
        """

        let createNotesTable = """
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            isPinned INTEGER DEFAULT 0,
            workspaceId TEXT NOT NULL,
            revision INTEGER DEFAULT 1
        );
        """

        let createHabitsTable = """
        CREATE TABLE IF NOT EXISTS habits (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            frequency TEXT NOT NULL,
            streak INTEGER DEFAULT 0,
            workspaceId TEXT NOT NULL,
            revision INTEGER DEFAULT 1
        );
        """

        let createCalendarEventsTable = """
        CREATE TABLE IF NOT EXISTS calendarEvents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            startDate TEXT NOT NULL,
            endDate TEXT NOT NULL,
            isAllDay INTEGER DEFAULT 0,
            workspaceId TEXT NOT NULL,
            revision INTEGER DEFAULT 1
        );
        """

        let createSyncQueueTable = """
        CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            tableName TEXT NOT NULL,
            entityId TEXT NOT NULL,
            clientTimestamp INTEGER NOT NULL,
            clientRevision INTEGER NOT NULL,
            data TEXT
        );
        """

        executeSQL(createTasksTable)
        executeSQL(createProjectsTable)
        executeSQL(createPlansTable)
        executeSQL(createNotesTable)
        executeSQL(createHabitsTable)
        executeSQL(createCalendarEventsTable)
        executeSQL(createSyncQueueTable)
    }

    private func executeSQL(_ sql: String) {
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            if sqlite3_step(statement) != SQLITE_DONE {
                print("Failed to run SQL statement: \(sql)")
            }
        }
        sqlite3_finalize(statement)
    }

    // Generic select helper
    public func queryTasks() -> [Task] {
        var list: [Task] = []
        let sql = "SELECT id, title, description, status, priority, dueDate, timeOfDay, expectedDuration, projectId, planId, workspaceId FROM tasks;"
        var statement: OpaquePointer?
        
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            while sqlite3_step(statement) == SQLITE_ROW {
                let id = String(cString: sqlite3_column_text(statement, 0))
                let title = String(cString: sqlite3_column_text(statement, 1))
                let desc = sqlite3_column_text(statement, 2) != nil ? String(cString: sqlite3_column_text(statement, 2)) : nil
                let status = String(cString: sqlite3_column_text(statement, 3))
                let priority = String(cString: sqlite3_column_text(statement, 4))
                let dueDate = sqlite3_column_text(statement, 5) != nil ? String(cString: sqlite3_column_text(statement, 5)) : nil
                let timeOfDay = sqlite3_column_text(statement, 6) != nil ? String(cString: sqlite3_column_text(statement, 6)) : nil
                let duration = sqlite3_column_int(statement, 7)
                let projectId = sqlite3_column_text(statement, 8) != nil ? String(cString: sqlite3_column_text(statement, 8)) : nil
                let planId = sqlite3_column_text(statement, 9) != nil ? String(cString: sqlite3_column_text(statement, 9)) : nil
                let wsId = String(cString: sqlite3_column_text(statement, 10))
                
                let task = Task(
                    id: id,
                    title: title,
                    description: desc,
                    status: status,
                    priority: priority,
                    dueDate: dueDate,
                    timeOfDay: timeOfDay,
                    expectedDuration: Int(duration),
                    projectId: projectId,
                    planId: planId,
                    workspaceId: wsId
                )
                list.append(task)
            }
        }
        sqlite3_finalize(statement)
        return list
    }

    public func saveTask(_ task: Task) {
        let sql = """
        INSERT OR REPLACE INTO tasks (id, title, description, status, priority, dueDate, timeOfDay, expectedDuration, projectId, planId, workspaceId, revision)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        var statement: OpaquePointer?
        
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_text(statement, 1, (task.id as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 2, (task.title as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 3, (task.description as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_text(statement, 4, (task.status as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 5, (task.priority as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 6, (task.dueDate as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_text(statement, 7, (task.timeOfDay as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_int(statement, 8, Int32(task.expectedDuration ?? 0))
            sqlite3_bind_text(statement, 9, (task.projectId as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_text(statement, 10, (task.planId as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_text(statement, 11, (task.workspaceId as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 12, Int32(task.revision))
            
            if sqlite3_step(statement) != SQLITE_DONE {
                print("Failed to save task \(task.id)")
            }
        }
        sqlite3_finalize(statement)
        
        // Log mutation
        queueMutation(type: "UPDATE", table: "tasks", entityId: task.id, revision: task.revision)
    }

    public func deleteTask(id: String) {
        let sql = "DELETE FROM tasks WHERE id = ?;"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_text(statement, 1, (id as NSString).utf8String, -1, nil)
            sqlite3_step(statement)
        }
        sqlite3_finalize(statement)
        queueMutation(type: "DELETE", table: "tasks", entityId: id, revision: 1)
    }

    // Generic list query for Notes
    public func queryNotes() -> [Note] {
        var list: [Note] = []
        let sql = "SELECT id, title, content, isPinned, workspaceId FROM notes;"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            while sqlite3_step(statement) == SQLITE_ROW {
                let id = String(cString: sqlite3_column_text(statement, 0))
                let title = String(cString: sqlite3_column_text(statement, 1))
                let content = String(cString: sqlite3_column_text(statement, 2))
                let isPinned = sqlite3_column_int(statement, 3) != 0
                let wsId = String(cString: sqlite3_column_text(statement, 4))
                list.append(Note(id: id, title: title, content: content, isPinned: isPinned, workspaceId: wsId))
            }
        }
        sqlite3_finalize(statement)
        return list
    }

    public func saveNote(_ note: Note) {
        let sql = "INSERT OR REPLACE INTO notes (id, title, content, isPinned, workspaceId, revision) VALUES (?, ?, ?, ?, ?, ?);"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_text(statement, 1, (note.id as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 2, (note.title as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 3, (note.content as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 4, note.isPinned ? 1 : 0)
            sqlite3_bind_text(statement, 5, (note.workspaceId as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 6, Int32(note.revision))
            sqlite3_step(statement)
        }
        sqlite3_finalize(statement)
        queueMutation(type: "UPDATE", table: "notes", entityId: note.id, revision: note.revision)
    }

    // Generic list query for Projects
    public func queryProjects() -> [Project] {
        var list: [Project] = []
        let sql = "SELECT id, name, description, icon, color, status, workspaceId FROM projects;"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            while sqlite3_step(statement) == SQLITE_ROW {
                let id = String(cString: sqlite3_column_text(statement, 0))
                let name = String(cString: sqlite3_column_text(statement, 1))
                let desc = sqlite3_column_text(statement, 2) != nil ? String(cString: sqlite3_column_text(statement, 2)) : nil
                let icon = sqlite3_column_text(statement, 3) != nil ? String(cString: sqlite3_column_text(statement, 3)) : nil
                let color = sqlite3_column_text(statement, 4) != nil ? String(cString: sqlite3_column_text(statement, 4)) : nil
                let status = String(cString: sqlite3_column_text(statement, 5))
                let wsId = String(cString: sqlite3_column_text(statement, 6))
                
                list.append(Project(id: id, name: name, description: desc, icon: icon, color: color, status: status, workspaceId: wsId))
            }
        }
        sqlite3_finalize(statement)
        return list
    }

    public func saveProject(_ project: Project) {
        let sql = "INSERT OR REPLACE INTO projects (id, name, description, icon, color, status, workspaceId, revision) VALUES (?, ?, ?, ?, ?, ?, ?, ?);"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_text(statement, 1, (project.id as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 2, (project.name as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 3, (project.description as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_text(statement, 4, (project.icon as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_text(statement, 5, (project.color as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_text(statement, 6, (project.status as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 7, (project.workspaceId as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 8, 1)
            sqlite3_step(statement)
        }
        sqlite3_finalize(statement)
        queueMutation(type: "UPDATE", table: "projects", entityId: project.id, revision: 1)
    }

    // Generic list query for Plans
    public func queryPlans() -> [Plan] {
        var list: [Plan] = []
        let sql = "SELECT id, title, vision, type, progress, workspaceId FROM plans;"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            while sqlite3_step(statement) == SQLITE_ROW {
                let id = String(cString: sqlite3_column_text(statement, 0))
                let title = String(cString: sqlite3_column_text(statement, 1))
                let vision = sqlite3_column_text(statement, 2) != nil ? String(cString: sqlite3_column_text(statement, 2)) : nil
                let type = String(cString: sqlite3_column_text(statement, 3))
                let progress = sqlite3_column_int(statement, 4)
                let wsId = String(cString: sqlite3_column_text(statement, 5))
                
                list.append(Plan(id: id, title: title, vision: vision, type: type, progress: Int(progress), workspaceId: wsId))
            }
        }
        sqlite3_finalize(statement)
        return list
    }

    public func savePlan(_ plan: Plan) {
        let sql = "INSERT OR REPLACE INTO plans (id, title, vision, type, progress, workspaceId, revision) VALUES (?, ?, ?, ?, ?, ?, ?);"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_text(statement, 1, (plan.id as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 2, (plan.title as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 3, (plan.vision as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_text(statement, 4, (plan.type as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 5, Int32(plan.progress))
            sqlite3_bind_text(statement, 6, (plan.workspaceId as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 7, 1)
            sqlite3_step(statement)
        }
        sqlite3_finalize(statement)
        queueMutation(type: "UPDATE", table: "plans", entityId: plan.id, revision: 1)
    }

    // Habits selects
    public func queryHabits() -> [Habit] {
        var list: [Habit] = []
        let sql = "SELECT id, name, frequency, streak, workspaceId FROM habits;"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            while sqlite3_step(statement) == SQLITE_ROW {
                let id = String(cString: sqlite3_column_text(statement, 0))
                let name = String(cString: sqlite3_column_text(statement, 1))
                let freq = String(cString: sqlite3_column_text(statement, 2))
                let streak = sqlite3_column_int(statement, 3)
                let wsId = String(cString: sqlite3_column_text(statement, 4))
                
                list.append(Habit(id: id, name: name, frequency: freq, streak: Int(streak), workspaceId: wsId))
            }
        }
        sqlite3_finalize(statement)
        return list
    }

    public func saveHabit(_ habit: Habit) {
        let sql = "INSERT OR REPLACE INTO habits (id, name, frequency, streak, workspaceId, revision) VALUES (?, ?, ?, ?, ?, ?);"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_text(statement, 1, (habit.id as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 2, (habit.name as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 3, (habit.frequency as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 4, Int32(habit.streak))
            sqlite3_bind_text(statement, 5, (habit.workspaceId as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 6, 1)
            sqlite3_step(statement)
        }
        sqlite3_finalize(statement)
        queueMutation(type: "UPDATE", table: "habits", entityId: habit.id, revision: 1)
    }

    // Calendar events
    public func queryCalendarEvents() -> [CalendarEvent] {
        var list: [CalendarEvent] = []
        let sql = "SELECT id, title, description, startDate, endDate, isAllDay, workspaceId FROM calendarEvents;"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            while sqlite3_step(statement) == SQLITE_ROW {
                let id = String(cString: sqlite3_column_text(statement, 0))
                let title = String(cString: sqlite3_column_text(statement, 1))
                let desc = sqlite3_column_text(statement, 2) != nil ? String(cString: sqlite3_column_text(statement, 2)) : nil
                let start = String(cString: sqlite3_column_text(statement, 3))
                let end = String(cString: sqlite3_column_text(statement, 4))
                let allDay = sqlite3_column_int(statement, 5) != 0
                let wsId = String(cString: sqlite3_column_text(statement, 6))
                
                list.append(CalendarEvent(id: id, title: title, description: desc, startDate: start, endDate: end, isAllDay: allDay, workspaceId: wsId))
            }
        }
        sqlite3_finalize(statement)
        return list
    }

    public func saveCalendarEvent(_ event: CalendarEvent) {
        let sql = "INSERT OR REPLACE INTO calendarEvents (id, title, description, startDate, endDate, isAllDay, workspaceId, revision) VALUES (?, ?, ?, ?, ?, ?, ?, ?);"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            sqlite3_bind_text(statement, 1, (event.id as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 2, (event.title as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 3, (event.description as NSString?)?.utf8String, -1, nil)
            sqlite3_bind_text(statement, 4, (event.startDate as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 5, (event.endDate as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 6, event.isAllDay ? 1 : 0)
            sqlite3_bind_text(statement, 7, (event.workspaceId as NSString).utf8String, -1, nil)
            sqlite3_bind_int(statement, 8, 1)
            sqlite3_step(statement)
        }
        sqlite3_finalize(statement)
        queueMutation(type: "UPDATE", table: "calendarEvents", entityId: event.id, revision: 1)
    }

    // Mutation Queue select
    public func querySyncQueue() -> [SyncMutation] {
        var list: [SyncMutation] = []
        let sql = "SELECT type, tableName, entityId, clientTimestamp, data FROM sync_queue;"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            while sqlite3_step(statement) == SQLITE_ROW {
                let type = String(cString: sqlite3_column_text(statement, 0))
                let table = String(cString: sqlite3_column_text(statement, 1))
                let entityId = String(cString: sqlite3_column_text(statement, 2))
                let timestamp = sqlite3_column_int64(statement, 3)
                let rawData = sqlite3_column_text(statement, 4) != nil ? String(cString: sqlite3_column_text(statement, 4)) : nil
                
                var dataDict: [String: String]? = nil
                if let rawData = rawData, let dataBytes = rawData.data(using: .utf8) {
                    dataDict = try? JSONDecoder().decode([String: String].self, from: dataBytes)
                }

                list.append(SyncMutation(type: type, table: table, entityId: entityId, clientTimestamp: timestamp, data: dataDict))
            }
        }
        sqlite3_finalize(statement)
        return list
    }

    public func clearSyncQueue() {
        executeSQL("DELETE FROM sync_queue;")
    }

    private func queueMutation(type: String, table: String, entityId: String, revision: Int) {
        let sql = "INSERT OR REPLACE INTO sync_queue (id, type, tableName, entityId, clientTimestamp, clientRevision, data) VALUES (?, ?, ?, ?, ?, ?, ?);"
        var statement: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK {
            let uniqueId = UUID().uuidString
            let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
            
            sqlite3_bind_text(statement, 1, (uniqueId as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 2, (type as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 3, (table as NSString).utf8String, -1, nil)
            sqlite3_bind_text(statement, 4, (entityId as NSString).utf8String, -1, nil)
            sqlite3_bind_int64(statement, 5, timestamp)
            sqlite3_bind_int(statement, 6, Int32(revision))
            sqlite3_bind_text(statement, 7, nil, -1, nil) // simple flat mapping
            
            sqlite3_step(statement)
        }
        sqlite3_finalize(statement)
        
        // Background replicate
        SyncManager.shared.sync()
    }
}
